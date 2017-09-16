/**
 * System alarms
 */

Components.define(
	function(uuid, argFormatter, warn){
		var ongoingAlarms = {};

		function SysAlarm(name, clearMethod, looped){
			internal.registerAlarm(name, this);

			this.name = name;
			this._clearMethod = clearMethod;
			this.looped = looped;
		}
		SysAlarm.prototype.clear = function(){
			this._clearMethod();
			internal.deregisterAlarm(this.name);

			return true;
		};
		SysAlarm.prototype.callback = function(){};

		chrome.alarms.onAlarm.addListener(function(alarminfo){
			var alarm = internal.getAlarm(alarminfo.name);

			if(alarm){
				if(!alarm.looped)	alarm.clear();
				alarm.callback.call(this, alarminfo);
			}
		});

		function timeoutHandler(alarmName, alarmScheduledTime){
			var alarm = internal.getAlarm(alarmName);

			if(alarm){	
			    alarm.clear();
				alarm.callback.call(this, {name: alarmName, scheduledTime: alarmScheduledTime, frequent: true});

			    if(alarm.looped){
					//warn("alarms.timeoutHandler", "Looped frequent alarms are not implemented"), alarm.clear();
					app.create(alarm.name, {periodInMinutes: alarm.periodInMinutes}, alarm.callback, true);
				}
			}
		}

		var internal = {
			registerAlarm: function(name, alarm){
				ongoingAlarms[name] = alarm;
			},
			deregisterAlarm: function(name){
				if(internal.isAlarmNameRegistered(name)){
					delete ongoingAlarms[name];
					return true;
				}else{
					return false;
				}
			},
			isAlarmNameRegistered: function(name){
				return name in ongoingAlarms;
			},
			getAlarm: function(name){
				return ongoingAlarms[name];
			},
			getAllAlarms: function(){
				return ongoingAlarms;
			}
		};

		var app = {
			create: function(){
				var input = argFormatter(arguments, {
					name: "alarms.create",
					definitions: {
						default: [
							{name: "name", type: "string", optional: true, default: uuid()}, 
							{name: "alarminfo", type: "object"}, 
							{name: "callback", type: "function", optional: true, default: function(){}}, 
							{name: "frequent", type: "boolean", optional: true, default: false}
						]
					}
				}, true);

				var args = input.arguments;
				
				var clearMethod = function(){};

				// check if name is used by another alarm
				if(internal.isAlarmNameRegistered(args.name)){
					// clear alarm
					internal.getAlarm(args.name).clear();

					warn("alarms.create", "Cancelled previous alarm \"" + args.name + "\".");
				}

				var duration = 0;
				if(args.alarminfo.when)	duration = args.alarminfo.when - Date.now();
				else                   	duration = args.alarminfo.delayInMinutes * 60 * 1000;

				if(duration < 60 * 1000){
					// switch to setTimeout if duration is less than 1 minute
					args.frequent = true;
				}

				if(args.frequent){
					//default
					if(!args.alarminfo.delayInMinutes)	args.alarminfo.delayInMinutes = args.alarminfo.periodInMinutes;

					if(args.alarminfo.when || args.alarminfo.delayInMinutes){
						var duration = 0;
						if(args.alarminfo.when)	duration = args.alarminfo.when - Date.now();
						else                   	duration = args.alarminfo.delayInMinutes * 60 * 1000;
						
						if(duration > 2147483647){
							throw "Duration \"" + duration + "\" over 2147483647 seconds cannot be used in frequent alarms.";
						}

						var timeoutId = setTimeout(function(){
							timeoutHandler(args.name, args.alarminfo.when);
						}, duration);

						clearMethod = function(){
							clearTimeout(timeoutId);
						};
					}else{
						throw "Unsupported";
					}
				}else{
					chrome.alarms.create(args.name, args.alarminfo);

					clearMethod = function(){
						chrome.alarms.clear(args.name);
					};
				}

				// create alarm
				var sysAlarm = new SysAlarm(args.name, clearMethod, !!args.alarminfo.periodInMinutes);
				sysAlarm.callback = args.callback;
				sysAlarm.periodInMinutes = args.alarminfo.periodInMinutes;
			},
			clear: function(){
				var input = argFormatter(arguments, {
					name: "alarms.remove",
					definition: [{
						name: "name", type: "string"
					}]
				}, true);

				var args = input.arguments;
				var alarm = internal.getAlarm(args.name);

				if(alarm){
					alarm.clear();
					return true;
				}

				return false;
			},
			get: function(){
				var input = argFormatter(arguments, {
					name: "alarms.get",
					definitions: {
						default: [{
							name: "name", type: "string"
						}]
					}
				}, true);

				return internal.getAlarm(input.arguments.name);
			},
			getAll: function(){
				var input = argFormatter(arguments, {
					name: "alarms.getAll",
					definition: []
				}, true);

				// return cloned array
				return $.extend({}, internal.getAllAlarms());
			}
		};

		// clear all previously set alarms
		chrome.alarms.clearAll();

		return app;
	}
);