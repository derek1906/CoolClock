/**
 * Countdown timer component
 */

Components.define(
	function(SoundManager, storage, argFormatter, uuid, alarms, Formatter, ringtoneFetcher, WindowManager, KeepAwake){
		var STORAGE_NAME = "countdown",
			COUNTDOWN_RINGTONE_AUDIO_NAME = "countdown-timer-ringtone",
			SYSALARM_ID_PREFIX = "countdowntimer-timer-id-",
			KEEP_AWAKE_ID_PREFIX = "CountdownTimer-timer-id-";

		/** stores all active timers, sorted with the next scheduled timer at the front */
		var timers = [];

		/**
		 * @class Countdown timer
		 */
		function CountdownTimer(){
			var input = argFormatter(arguments, {
				name: "CountdownTimer.constructor",
				definitions: {
					"default": [],
					"copy": [{name: "source", type: CountdownTimer}]
				}
			}, true);

			if(input.definition === "copy"){
				for(var key in input.arguments.source){
					if(!input.arguments.source.hasOwnProperty(key))	continue;

					this[key] = input.arguments.source[key];
				}
			}
		};
		/** Set timer properties */
		CountdownTimer.prototype.set = function(){
			var input = argFormatter(arguments, {
				name: "CountdownTimer.prototype.set",
				definitions: {
					"single": [
						{name: "key", type: "string"}, {name: "value", type: "*"}
					],
					"mulitple": [
						{name: "pairs", type: "object"}
					]
				}
			}, true);

			var args = input.arguments;

			switch(input.definition){
				case "single":
					this[args.key] = args.value;
					break;

				case "mulitple":
					for(var key in args.pairs){
						if(!args.pairs.hasOwnProperty(key))	continue;

						this[key] = args.pairs[key];
					}
					break;
			}

			internal.updateStorage();
		};
		/** Remove timer from storage and clear system alarm */
		CountdownTimer.prototype.remove = function(){
			argFormatter(arguments, {
				name: "CountdownTimer.prototype.remove",
				definition: []
			}, true);

			app.remove(this.id);
		};
		/** Get remaining time in readable string */
		CountdownTimer.prototype.getRemainingString = function(){
			return Formatter.format("duration", (this.end - Date.now())/1000);
		};
		CountdownTimer.prototype.displayNotification = function(){
			var self = this;
			var aduioTerminated = false;

			// define buttons for notification
			var buttons = [{
				title: "Dismiss",
				iconUrl: "/images/icons/bell_go.png",
				onclick: function(){
					// stop audio
					SoundManager.pause(COUNTDOWN_RINGTONE_AUDIO_NAME);
				}
			}];

			if(this.repeat){
				// add button for removing timer
				buttons.push({
					title: "Clear repeat and close",
					iconUrl: "/images/icons/cross.png",
					onclick: function(){
						// stop audio
						SoundManager.pause(COUNTDOWN_RINGTONE_AUDIO_NAME);

						// remove timer
						app.remove(self.id);
					}
				});
			}
			// dismiss previous notification if exists
			if(this.notification){
				this.notification.cancel();
			}

			// create notification
			var noti = this.notification = createNoti({
				title: this.message || i18n("countdown"),
				message: "Time's up!",
				isClickable: true,
				requireInteraction: true
			}, {
				buttons: buttons,
				onclose: function(){
					aduioTerminated = true;
					// stop audio
					SoundManager.pause(COUNTDOWN_RINGTONE_AUDIO_NAME);
				},
				onclick: function(){
					app.displayUI();
				}
			});

			// play sound
			ringtoneFetcher.get(function(url){
				if(url && !aduioTerminated){
					// only play sound if url is defined and notification has not been terminated
					SoundManager.getControls(COUNTDOWN_RINGTONE_AUDIO_NAME).src = url;
					SoundManager.play(COUNTDOWN_RINGTONE_AUDIO_NAME, {
						fromStart: true,
						repeat: storage.get("ring_loop")
					});
				}
			});


			// show notification
			noti.show();
		};

		var internal = {
			/**
			 * Initialize module
			 */
			init: function(){
				// reset timers and sync
				timers = [];
				internal.updateStorage();

				// register ringtone
				SoundManager.create(COUNTDOWN_RINGTONE_AUDIO_NAME);
				
			},
			updateStorage: function(){
				storage.set(STORAGE_NAME, timers);
			},
			addTimer: function(timer){
				// create system alarm
				alarms.create(SYSALARM_ID_PREFIX + timer.id, { when: timer.end }, function(data){
					internal.handleOSAlarm(data, timer);
				});

				// add to timer list
				timers.push(timer);

				// inefficient but works
				timers.sort((a, b) => a.end - b.end);

				// update storage
				internal.updateStorage();

				// request keep awake
				KeepAwake.request(KEEP_AWAKE_ID_PREFIX + timer.id);
			},
			removeTimer: function(timer){
				// remove timer from internal storage
				timers.splice(timers.indexOf(timer), 1);

				// clear system alarm
				alarms.clear(SYSALARM_ID_PREFIX + timer.id);

				// clear timer notification (if opened)
				if(timer.notification){
					timer.notification.cancel();
				}

				// update storage
				internal.updateStorage();

				// release keep awake
				KeepAwake.release(KEEP_AWAKE_ID_PREFIX + timer.id);
			},
			handleOSAlarm: function(info, timer){
				var timer = app.get(timer.id),
					terminated = false;

				if(timer){
					// remove timer from internal storage
					internal.removeTimer(timer);

					// display notification
					timer.displayNotification();

					// re-insert a new timer if repeat is enabled
					if(timer.repeat){
						var newStartTime = Date.now(),
							newEndTime = newStartTime + timer.duration;

						// create new timer
						var newTimer = new CountdownTimer(timer);

						newTimer.set({
							start: newStartTime,
							end: newEndTime
						});

						app.create(newTimer);
					}

				}
			}
		}

		/**
		 * Countdown timer interface
		 * @module interface
		 */
		var app = {
			create: function(){
				var input = argFormatter(arguments, {
						name: "CountdownTimer.create",
						definitions: {
							"default": [
								{name: "timerId", type: "string", optional: true, default: uuid()},
								{name: "endTime", type: "number"},
								{name: "options", type: "object", optional: true, default: {}}
							],
							"existingTimer": [
								{name: "timer", type: CountdownTimer}
							]
						}
					}, true),
					args = input.arguments;

				var timer;

				if(input.definition === "default"){
					// create timer with default values
					timer = $.extend(new CountdownTimer(), {
						id: args.timerId,
						start: Date.now(),
						end: args.endTime,
						duration: args.endTime - Date.now(),

						color: "primary",
						repeat: false,
						message: ""
					});

					// extend options
					timer = $.extend(timer, args.options);

				}else if(input.definition === "existingTimer"){
					// use existing timer
					timer = args.timer;
				}

				internal.addTimer(timer);

				return timer;
			},
			remove: function(timerId){
				argFormatter(arguments, {
					name: "CountdownTimer.remove",
					definition: [{name: "timerId", type: "string"}]
				}, true);

				var timer = app.get(timerId);

				if(timer){
					internal.removeTimer(timer);
					return true;
				}

				return false;
			},
			get: function(timerId){
				argFormatter(arguments, {
					name: "CountdownTimer.get",
					definition: [{name: "timerId", type: "string"}]
				}, true);

				return timers.find(function(timer){
					return timer.id === timerId;
				});
			},
			getAll: function(){
				// return a shallow copy
				return timers.slice();
			},
			getNextScheduledTimer: function(){
				// returns first timer
				return timers[0];
			},
			displayUI: function(){
				// create window through WindowManager
				WindowManager.create("/countdown_interface.html", {width: 700, height: 450});
			}
		};

		internal.init();

		return app;
	}
);