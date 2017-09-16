/**
 * Hourly time announcement handler
 */

Components.define(
	function(__NAME__, log, warn, TimeTZ, alarms, storage, argFormatter, SoundManager, Graphics, GraphicsPresets, WeatherHandler, Localization){
		var HOURLY_TIME_ANNOUCEMENT_ADUIO_NAME = "hourly-notification-audio";

		var paused = false;
		chrome.idle.onStateChanged.addListener(function(newState){
			if(newState === "locked" && paused === false){
				log(__NAME__, "Hourly time announcement paused at " + new TimeTZ().dateTimeString());
				// clear alarm
				alarms.clear("hourly-notification");
				paused = true;
			}else if(newState === "active" && paused === true){
				log(__NAME__, "Hourly time announcement resumed at " + new TimeTZ().dateTimeString());
				// continue loop
				internal.init();
				paused = false;
			}
		});

		var internal = {
			init: function(){
				var currentTime = new TimeTZ(), delayedTime = new TimeTZ(currentTime);
				
				// fast forward to next hour
				delayedTime.setMinutes(0);
				delayedTime.setSeconds(0);
				delayedTime.setMilliseconds(0);
				if(delayedTime.getTime() < currentTime.getTime()){
					delayedTime.setHours(delayedTime.getHours() + 1);
				}

				// create periodic alarm
				alarms.create("hourly-notification", {
					//delayInMinutes: minutesRemainingToNextHour,
					when: +delayedTime.source,
					periodInMinutes: 60
				}, function(){
					var time = new TimeTZ();

					log("HourlyTimeAnnouncementHandler", "Hourly time announcement notification checking triggered at", time.timeString());

					/**
					 * Only executes when minutes is exactly at 0,
					 * alarms might be delayed indefinitely.
					 */
					if(time.getMinutes() === 0){
						if(storage.get("shownotification")){
							// if notification is enabled
							app.displayNotification();
						}
					}
				});

				// create notification audio
				SoundManager.create(HOURLY_TIME_ANNOUCEMENT_ADUIO_NAME);
			}
		};
		
		var app = {
			/**
			 * Display notification
			 * @param {String} [notificationStyle] Notification style
			 */
			displayNotification: function(){
				var input = argFormatter(arguments, {
					name: "HourlyTimeAnnouncementHandler.displayNotification",
					definition: [{name: "notificationStyle", type: "string", optional: true, default: storage.get("noti_style", true)}]
				}, true), args = input.arguments;
				var notification;

				switch(args.notificationStyle){
					case "compact":
						notification = app.createCompactNotification(); break;

					case "default":
					default:
						notification = app.createDefaultNotification(); break;
				}

			    app.playNotificationAudio().then(app.speakDefinedMessage);
			},
			createCompactNotification: function(){
				var currentTime = new TimeTZ(),
					iconModel = GraphicsPresets.create("notification-icon"),
					openWeatherPage = function(){};

				// sets current time
				iconModel.setTime(currentTime.emulated);

				// set up notification
				var notification = createNoti({
					title: currentTime.generalTimeString(),
					message: "",
					contextMessage: Localization.getMessage("hourlytimeannounce"),
					type: "list",
					iconUrl: iconModel.render().toDataURL(),
					isClickable: false,
					items: [{title: "", message: ""}]
				},{
					buttons: WeatherHandler.isEnabled() ? [{
						title: "View weather details...",
						onclick: function(){
							openWeatherPage();
						}
					}] : undefined,
					time: storage.get("manuallyclosenoti") ? undefined : storage.get("shownotificationtime") * 1000,
					onclose: function(){
						// TODO: stop sound
						SoundManager.pause(HOURLY_TIME_ANNOUCEMENT_ADUIO_NAME);
					},
					onclick: function(){
						// TODO: stop sound
						SoundManager.pause(HOURLY_TIME_ANNOUCEMENT_ADUIO_NAME);
					}
				});

				// displays weather data
				function displayWeatherSuccess(notification, data){
					notification.update({
						items: [{
							title: data.city, 
							message: data.temperature.celcius + "°C / " + data.temperature.fahrenheit + "°F, " + data.condition
						}]
					});
					openWeatherPage = function(){
						chrome.tabs.create({ url: data.link });
					};
				}
				function displayWeatherFailed(notification){
					notification.update({
						items: [{title: "Weather", message: "Not available"}]
					});
				}

				if(WeatherHandler.isEnabled()){
					// load weather
					notification.update({
						items: [{title: "Weather", message: "Loading..."}]
					});

					WeatherHandler.get(function(result){
						switch(result.status){
							case "success":
							case "cache":
								displayWeatherSuccess(notification, result.data);
								break;
							case "failed":
								if(result.data)	displayWeatherSuccess(notification, result.data);
								else           	displayWeatherFailed(notification);

						}
					})
				}else{
					notification.update({
						items: [{title: currentTime.dateString(), message: ""}]
					});
				}
			},
			createDefaultNotification: function(){
				// TODO: Add Yahoo Weather logo

				var currentTime = new TimeTZ(),
					model = GraphicsPresets.create("notification-main"),
					iconModel = GraphicsPresets.create("notification-icon"),
					openWeatherPage = function(){};

				// sets current time
				model.setTime(currentTime.emulated, storage.get("pm"));
				iconModel.setTime(currentTime.emulated);

				// set up notification
				var notification = createNoti({
					title: Localization.getMessage("hourlytimeannounce"),
					message: "",
					contextMessage: currentTime.dateString(),
					type: "image",
					imageUrl: model.render().toDataURL(),
					iconUrl: iconModel.render().toDataURL(),
				},{
					buttons: WeatherHandler.isEnabled() ? [{
						title: "View weather details...",
						onclick: function(){
							openWeatherPage();
						}
					}] : undefined,
					time: storage.get("manuallyclosenoti") ? undefined : storage.get("shownotificationtime") * 1000,
					onclose: function(){
						// TODO: stop sound
						SoundManager.pause(HOURLY_TIME_ANNOUCEMENT_ADUIO_NAME);
					},
					onclick: function(){
						// TODO: stop sound
						SoundManager.pause(HOURLY_TIME_ANNOUCEMENT_ADUIO_NAME);
					}
				});

				// displays weather data
				function displayWeatherSuccess(model, notification, data){
					model.setCaption([{
						text: data.temperature.celcius + "°C/" + data.temperature.fahrenheit + "°F in " + data.city,
						fontSize: 20, fontFamily: "Roboto-Thin", color: "white"
					}]);
					model.setSubcaption([{
						text: data.conditionIconChar,
						fontSize: 15, fontFamily: "meteocons", color: "white"
					}, {
						text: " " + data.condition,
						fontSize: 15, fontFamily: "Roboto-Thin", color: "white"
					}]);
					openWeatherPage = function(){
						chrome.tabs.create({ url: data.link });
					};
					notification.update({ imageUrl: model.render().toDataURL() });
				}
				function displayWeatherFailed(model, notification){
					model.setCaption([{
						text: "Not available",
						fontSize: 12, fontFamily: "Roboto-Thin", color: "white"
					}]);
					notification.update({ imageUrl: model.render().toDataURL() });
				}

				if(WeatherHandler.isEnabled()){
					// load weather
					model.setCaption([{
						text: "Loading...",
						fontSize: 20, fontFamily: "Roboto-Thin", color: "white"
					}]);
					notification.update({ imageUrl: model.render().toDataURL() });

					WeatherHandler.get(function(result){
						switch(result.status){
							case "success":
							case "cache":
								displayWeatherSuccess(model, notification, result.data);
								break;
							case "failed":
								if(result.data)	displayWeatherSuccess(model, notification, result.data);
								else           	displayWeatherFailed(model, notification);

						}
					})
				}else{
					// display default date information
					model.setCaption([{
						text: currentTime.dateString(),
						fontSize: 20, fontFamily: "Roboto-Thin", color: "white"
					}]);

					// TODO: Lunar calendar

					notification.update({ imageUrl: model.render().toDataURL() });
				}
			},
			/**
			 * Speak predefined message
			 * @return {Promise} Promise
			 */
			speakDefinedMessage: function(){
				return new Promise(function(resolve, reject){
					var notiVoice = storage.get("noti_voice");

					if(notiVoice.enabled){
						var voiceOptions = storage.get("voice"),
							time = new TimeTZ();

						var text = notiVoice.text.replace(/%([HhPM])/g, function(ignore, char){
							switch(char){
								case "H":
									return +Formatter.format("hour24TwoDigitHour", time.getHours());
								case "h":
									return +Formatter.format("hour12TwoDigitHour", time.getHours());
								case "P":
									return Localization.getMessage(time.getHours() < 12 ? "am" : "pm");
								case "M":
									return time.getMinutes();
								default:
									return "";
							}
						});

						chrome.tts.stop();
						chrome.tts.speak(text,{
							voiceName         	: voiceOptions.voiceName,
							rate              	: voiceOptions.speed,
							volume            	: 1,
							rate              	: 1.1,
							requiredEventTypes	: ['end'],
							onEvent: function(event) {
								if(event.type === 'end') {
									resolve();
								}
							}
						});
					}else{
						// not enabled
						resolve();
					}
				});
			},
			/**
			 * Play preset notification audio
			 * @return {Promise} Promise
			 */
			playNotificationAudio: function(){
				return new Promise(function(resolve, reject){
					var audioPath = storage.get("noti_sound", true);
					
					if(audioPath === "none"){
						resolve();
					}else{
						var audio = SoundManager.getControls(HOURLY_TIME_ANNOUCEMENT_ADUIO_NAME);

						audio.src = audioPath;
						audio.addEventListener("ended", function listener(){
							audio.removeEventListener("ended", listener);
							resolve();
						});

						SoundManager.play(HOURLY_TIME_ANNOUCEMENT_ADUIO_NAME, {fromStart: true});
					}
				});
			}
		};

		internal.init();
		storage.addListener("enabletimezone", internal.init);
		storage.addListener("timezone", internal.init);

		return app;
	}
);