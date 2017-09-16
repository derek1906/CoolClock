/**
 * Multi timezone date object
 *
 * A custom object that modifies its time and data to emulate a switch of timezone
 * according to user preferences with almost the same interface as a normal Date object.
 */

Components.define(
	function(argFormatter, storage, Localization){
		function TimeObject(){
			var input = argFormatter(arguments, {
				name: "TimeTZ",
				definitions: {
					"default": [],
					"emulatedTimestamp": [{name: "emulatedTimestamp", type: "number"}],
					"DateObject": [{name: "dateObject", type: "Date"}],
					"TimeObject": [{name: "other", type: TimeObject}],
					"specific": [
						{name: "year", type: "number"},
						{name: "month", type: "number"},
						{name: "day", type: "number", optional: true, default: 1},
						{name: "hours", type: "number", optional: true, default: 0},
						{name: "minutes", type: "number", optional: true, default: 0},
						{name: "seconds", type: "number", optional: true, default: 0},
						{name: "milliseconds", type: "number", optional: true, default: 0}
					]
				}
			}, true), args = input.arguments;

			// set timezones
			this.sourceTimezone = TimeObject.getRealTimezone();
			this.emulatedTimezone = TimeObject.getEmulatedTimezone();

			// set source
			switch(input.definition){
				case "default":
					this.setSource(new Date()); break;
				case "emulatedTimestamp":
					this.setSource(TimeObject.emulatedToReal(
						new Date(args.emulatedTimestamp),
						this.sourceTimezone,
						this.emulatedTimezone)
					); 
					break;
				case "DateObject":
					this.setSource(TimeObject.emulatedToReal(
						args.dateObject,
						this.sourceTimezone,
						this.emulatedTimezone)
					);
					break;
				case "TimeObject":
					this.sourceTimezone = args.other.sourceTimezone;
					this.emulatedTimezone = args.other.emulatedTimezone;
					this.setSource(new Date(args.other._source));
					break;
				case "specific":
					this.setSource(TimeObject.emulatedToReal(
						new Date(args.year, args.month, args.day, args.hours, args.minutes, args.seconds, args.milliseconds),
						this.sourceTimezone,
						this.emulatedTimezone)
					);
					break;
			}
		}

		TimeObject.realToEmulated = function(realDate, realTimezone, emulatedTimezone){
			var emulatedDate = new Date();

			var offsetHours = ((-1 * realTimezone) + emulatedTimezone) * 1000 * 60 * 60;

			emulatedDate.setTime(realDate.getTime() + offsetHours);

			return emulatedDate;
		};

		TimeObject.emulatedToReal = function(emulatedDate, realTimezone, emulatedTimezone){
			var realDate = new Date();

			var offsetHours = ((-1 * realTimezone) + emulatedTimezone) * 1000 * 60 * 60;

			realDate.setTime(emulatedDate.getTime() - offsetHours);

			return realDate;
		};

		TimeObject.getRealTimezone = function(){
			return new Date().getTimezoneOffset() / -60;
		};

		TimeObject.getEmulatedTimezone = function(){
			return storage.get("enabletimezone") ? parseFloat(storage.get("timezone", true)) : TimeObject.getRealTimezone();
		};

		TimeObject.fromReal = function(realDate){
			var newTimeObj = new TimeObject();
			newTimeObj.setSource(realDate);

			return newTimeObj;
		};

		TimeObject.prototype.setSource = function(date){
			Object.defineProperty(this, "_source", {
				configurable: true,
				value: date
			});
		};

		TimeObject.prototype.valueOf = function(){
			return this.emulated.valueOf();
		};

		TimeObject.prototype.dateString = function(){
			return Intl.DateTimeFormat(Localization.getSelectedLanguage(), {
				year: "numeric", month: "long", day: "numeric"
			}).format(this.emulated);
		},
		TimeObject.prototype.timeString = function(){
			return Intl.DateTimeFormat(Localization.getSelectedLanguage(), {
				hour: "numeric", minute: "numeric", second: "numeric",
				hour12: storage.get("pm")
			}).format(this.emulated);
		},
		TimeObject.prototype.dateTimeString = function(){
			return Intl.DateTimeFormat(Localization.getSelectedLanguage(), {
				year: "numeric", month: "long", day: "numeric",
				hour: "numeric", minute: "numeric", second: "numeric",
				hour12: storage.get("pm")
			}).format(this.emulated);
		},
		TimeObject.prototype.generalTimeString = function(){
			return Intl.DateTimeFormat(Localization.getSelectedLanguage(), {
				hour: "numeric", minute: "numeric",
				hour12: storage.get("pm")
			}).format(this.emulated);
		},
		TimeObject.prototype.customString = function(format){
			var input = argFormatter(arguments, {
				name: "TimeObject.customString",
				definition: [
					{name: "format", type: "object"}
				]
			}, true), args = input.arguments;

			return Intl.DateTimeFormat(Localization.getSelectedLanguage(), format).format(this.emulated);
		},

		Object.defineProperties(TimeObject.prototype, {
			emulated: {
				get: function(){
					return TimeObject.realToEmulated(this._source, this.sourceTimezone, this.emulatedTimezone);
				}
			},
			source: {
				get: function(){
					return this._source;
				}
			}
		});

		var bootstrapMethodList = ["Date", "Day", "FullYear", "Hours", "Milliseconds", "Minutes", "Month", "Seconds", "Time"];
		bootstrapMethodList.forEach(function(methodName){
			var getterName = "get" + methodName,
				setterName = "set" + methodName;
			Object.defineProperty(TimeObject.prototype, getterName, {
				value: function(){
					var emulated = this.emulated;
					var rtn = Date.prototype[getterName].apply(emulated, arguments);
					return rtn;
				}
			});
			Object.defineProperty(TimeObject.prototype, setterName, {
				value: function(){
					var emulated = this.emulated;
					var rtn = Date.prototype[setterName].apply(emulated, arguments);
					this.setSource(TimeObject.emulatedToReal(emulated, this.sourceTimezone, this.emulatedTimezone));
					return rtn;
				}
			});
		});

		return TimeObject;
	}
);