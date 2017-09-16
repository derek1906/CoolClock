/**
 * Alarm clock component
 */

Components.define(
	function(log, argFormatter, storage, uuid, WindowManager, TimeTZ, alarms, KeepAwake, ringtoneFetcher, SoundManager, Formatter){
		var STORAGE_NAME = "alarm",
			ALARM_RINGTONE_AUDIO_NAME = "alarm-ringtone",
			SYSALARM_ID_PREFIX = "alarm-clock-id-",
			KEEP_AWAKE_ID_PREFIX = "AlarmClock-id-";
		var alarmEntries = [], activeAlarms = {};

		function AlarmEntry(){}
		/** Set timer properties */
		AlarmEntry.prototype.set = function(){
			var input = argFormatter(arguments, {
				name: "AlarmEntry.prototype.set",
				definitions: {
					"single": [
						{name: "key", type: "string"}, {name: "value", type: "*"}
					],
					"multiple": [
						{name: "pairs", type: "object"}
					]
				}
			}, true);

			var args = input.arguments, self = this;

			function setProperty(key, value){
				self[key] = value;
			}

			switch(input.definition){
				case "single":
					setProperty(args.key, args.value);
					break;

				case "multiple":
					for(var key in args.pairs){
						if(!args.pairs.hasOwnProperty(key))	continue;
						setProperty(key, args.pairs[key]);
					}
					break;
			}

			// update sysalarm
			if(this.off)	internal.setInactive(self);
			else        	internal.setActive(self);

			internal.updateStorage();
		};
		/** Get next scheduled time */
		AlarmEntry.prototype.getNextScheduledTime = function(){
			// alarm is off
			if(this.off)	return null;

			var currentTime = new TimeTZ(),
				nextScheduledTime;

			switch(this.getType()){
				case "one-time-only":
					nextScheduledTime = new TimeTZ(
						currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), this.hour, this.min);

					// fast forward a day
					if(nextScheduledTime.getTime() < currentTime.getTime()){
						nextScheduledTime.setDate(nextScheduledTime.getDate() + 1);
					}
					break;
				case "specific-days":
					// get current day of week
					var currentDay = currentTime.getDay(),
						nextScheduledDay = currentDay,
						nextScheduledDate = currentTime.getDate();

					while(true){
						if(this.day.indexOf(nextScheduledDay) > -1){
							// candidate
							nextScheduledTime = new TimeTZ(
								currentTime.getFullYear(), currentTime.getMonth(), nextScheduledDate, this.hour, this.min);

							if(nextScheduledTime.getTime() > currentTime.getTime())	break;	// solved
						}
						// continue
						nextScheduledDay = (nextScheduledDay + 1) % 7;
						nextScheduledDate++;
					}
					break;
			}

			return nextScheduledTime;
		};
		/** Get remaining time from next scheduled time */
		AlarmEntry.prototype.getRemainingTime = function(){
			var nextScheduledTime = this.getNextScheduledTime();

			if(nextScheduledTime === null)	return null;
			else                          	return nextScheduledTime - new TimeTZ();
		};
		AlarmEntry.prototype.getRemainingString = function(){
			return Formatter.format("duration", this.getRemainingTime);
		};
		/** Display notification */
		AlarmEntry.prototype.displayNotification = function(){
			var self = this;
			var aduioTerminated = false;

			// define buttons for notification
			var buttons = [{
				title: "Dismiss",
				iconUrl: "/images/icons/bell_go.png",
				onclick: function(){
					// stop audio
					SoundManager.pause(ALARM_RINGTONE_AUDIO_NAME);
				}
			}];

			var scheduledTime = new TimeTZ();
			scheduledTime.setHours(this.hour, this.min, 0, 0);

			// create notification
			var noti = createNoti({
				title: this.message || i18n("alarm"),
				message: "Scheduled time - " + i18n.timeString(scheduledTime.emulated),
				isClickable: true,
				requireInteraction: true
			}, {
				buttons: buttons,
				onclose: function(){
					aduioTerminated = true;
					// stop audio
					SoundManager.pause(ALARM_RINGTONE_AUDIO_NAME);
				},
				onclick: function(){
					app.displayUI();
				}
			});

			// play sound
			ringtoneFetcher.get(function(url){
				if(url && !aduioTerminated){
					// only play sound if url is defined and notification has not been terminated
					SoundManager.getControls(ALARM_RINGTONE_AUDIO_NAME).src = url;
					SoundManager.play(ALARM_RINGTONE_AUDIO_NAME, {
						fromStart: true,
						repeat: storage.get("ring_loop")
					});
				}
			});


			// show notification
			noti.show();
		};
		/** Get alarm type */
		AlarmEntry.prototype.getType = function(){
			if(!this.day || !this.day.length){
				// assume one time only if days of week is empty
				return "one-time-only";
			}

			switch(this.type){
				case "o":	return "one-time-only";
				case "s":	return "specific-days";
				default: 	return "unknown";
			};
		};

		var internal = {
			init: function(){
				// create audio
				SoundManager.create(ALARM_RINGTONE_AUDIO_NAME);

				// load alarms in storage
				internal.loadFromStorage();
			},
			loadFromStorage: function(){
				var storedEntries = storage.get(STORAGE_NAME);

				if(!storedEntries){
					internal.updateStorage();
					return;
				}

				storedEntries.forEach(function(entry){
					internal.addAlarm($.extend(new AlarmEntry(), entry));
				});
			},
			updateStorage: function(){
				storage.set(STORAGE_NAME, alarmEntries);
			},
			addAlarm: function(alarm){
				alarmEntries.push(alarm);
				if(!alarm.off)	internal.setActive(alarm);
			},
			removeAlarm: function(alarm){
				// set alarm to inactive
				internal.setInactive(alarm);

				// remove alarm entry from internal storage
				alarmEntries.splice(alarmEntries.indexOf(alarm), 1);

				// update storage
				internal.updateStorage();
			},
			setActive: function(alarm){
				// add to activeAlarms
				activeAlarms[alarm.id] = alarm;

				// create system alarm
				alarms.create(SYSALARM_ID_PREFIX + alarm.id, {
					when: +alarm.getNextScheduledTime().source
				}, function(data){
					internal.sysAlarmHandler(data, alarm);
				});
				
				// keep awake
				KeepAwake.request(KEEP_AWAKE_ID_PREFIX + alarm.id);
			},
			setInactive: function(alarm){
				// remove from activeAlarms
				delete activeAlarms[alarm.id];

				// clear system alarm
				alarms.clear(SYSALARM_ID_PREFIX + alarm.id);

				// release keep awake
				KeepAwake.release(KEEP_AWAKE_ID_PREFIX + alarm.id);
			},
			sysAlarmHandler: function(data, alarm){
				// show notification
				alarm.displayNotification();

				// set alarm to inactive
				app.setDisabled(alarm.id.toString());

				// set alarm back to active if alarm is repeating
				if(alarm.getType() === "specific-days"){
					app.setEnabled(alarm.id.toString());
				}
			}
		};

		var app = {
			get: function(entryId){
				var input = argFormatter(arguments, {
					name: "AlarmClock.get",
					definition: [{name: "entryId", type: "string"}]
				}, true);

				return alarmEntries.find(function(entry){
					return entry.id.toString() === entryId;
				});
			},
			getAll: function(){
				return alarmEntries.slice();
			},
			getActiveAlarms: function(){
				return Object.keys(activeAlarms).map(function(id){
					return activeAlarms[id];
				})
			},
			setEnabled: function(entryId){
				argFormatter(arguments, {
					name: "AlarmClock.setActive",
					definition: [{name: "entryId", type: "string"}]
				}, true);

				var alarm = app.get(entryId);
				if(alarm)	alarm.set("off", false);
			},
			setDisabled: function(entryId){
				argFormatter(arguments, {
					name: "AlarmClock.setInactive",
					definition: [{name: "entryId", type: "string"}]
				}, true);

				var alarm = app.get(entryId);
				if(alarm)	alarm.set("off", true);
			},
			create: function(){
				var input = argFormatter(arguments, {
					name: "AlarmClock.create",
					definition: [
						{name: "entryId", type: "string", optional: true, default: uuid()},
						{name: "hour", type: "number"},
						{name: "minute", type: "number"},
						{name: "options", type: "object", optional: true, default: {}}
					]
				}, true);

				var args = input.arguments;

				var alarm = $.extend(new AlarmEntry(), {
					id: args.entryId,
					hour: args.hour,
					min: args.minute,
					day: [],
					off: false,
					rang: false,
					text: "",
					type: "o"
				}, args.options);

				internal.addAlarm(alarm);
				internal.updateStorage();

				return alarm;
			},
			remove: function(entryId){
				argFormatter(arguments, {
					name: "AlarmClock.remove",
					definition: [{name: "entryId", type: "string"}]
				}, true);

				var alarm = app.get(entryId);
				if(alarm)	internal.removeAlarm(alarm);
			},
			removeAll: function(){
				app.getAll().forEach(function(alarm){
					internal.removeAlarm(alarm);
				});
			},
			displayUI: function(isCreatingNewAlarm){
				// create window through WindowManager
				WindowManager.create("/alarm_interface.html" + (isCreatingNewAlarm ? "#set" : ""));
			}
		};

		internal.init();

		return app;
	}
);