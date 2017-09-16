/**
 * Handles browser action
 */

Components.define(function(__NAME__, log, storage, TimeTZ, BadgeTextManager, Formatter, Graphics, GraphicsPresets){
	function applyDefault(preset, input){
		for(var key in input){
			preset[key] = input[key];
		}
		return preset;
	}

	var internal = {
		/**
		 * Manages badge clocks
		 */
		badgeClockManager: {
			mode: "none",
			runningInstance: null,

			start: function(mode){
				if(!mode)             	return;
				if(this.mode === mode)	return;
				if(this.mode !== "none"){
					this.stop();
					this.start(mode);
					return;
				}

				this.mode = mode;

				switch(mode){
					case "none":
						break;
					case "static":
						this.runningInstance = new this.StaticClock();
						this.runningInstance.start();
						break;
					case "scroll":
						this.runningInstance = new this.ScrollingClock();
						this.runningInstance.start();
						break;
				}
			},

			stop: function(){
				this.mode = "none";
				if(this.runningInstance){
					this.runningInstance.stop();
					delete this.runningInstance;
				}
			},

			StaticClock: function(){
				if(this === internal.badgeClockManager){
					throw new Error("This is a class.");
				}
				var self = this;

				var timer = 0;
				var displayTimer = 0;
				var firstHalf = true;
				var started = false;
				var badgeColor = storage.get("badge_color", true);

				BadgeTextManager.setDisplayer("StaticClock", function(){
					var text = this.text;
					if(firstHalf)	text = text.substr(0, 3);
					else         	text = text.substr(2, 3);

					return text;
				});

				function loop(){
					self.update();
					timer = setTimeout(loop, (60 - new Date().getSeconds()) * 1000);
				}

				function displayLoop(){
					firstHalf = !firstHalf;
					var clock = BadgeTextManager.get("StaticClock");
					if(clock)	clock.update();

					displayTimer = setTimeout(displayLoop, 5000);
				}

				this.update = function(){
					var currentTime = new TimeTZ().emulated;

					BadgeTextManager.set("StaticClock", 
						Formatter.format("twoDigitNum", currentTime.getHours()) + ":" +
						Formatter.format("twoDigitNum", currentTime.getMinutes()),
						badgeColor
					);
				};
				this.start = function(){
					if(!started){
						started = true;
						loop();
						displayLoop();
					}
				};
				this.stop = function(){
					if(started){
						started = false;
						clearTimeout(timer);
						clearTimeout(displayTimer);
						BadgeTextManager.remove("StaticClock");
					}
				};
			},

			ScrollingClock: function(){
				if(this === internal.badgeClockManager){
					throw new Error("This is a class.");
				}
				var self = this;

				var timer = 0;
				var displayTimer = 0;
				var displayIndex = 0;
				var started = false;
				var badgeColor = storage.get("badge_color", true);

				BadgeTextManager.setDisplayer("ScrollingClock", function(){
					var text = this.text;
					return (text + text).substr(displayIndex, 3);
				});

				function loop(){
					self.update();
					timer = setTimeout(loop, (60 - new Date().getSeconds()) * 1000);
				}

				function displayLoop(){
					displayIndex = (displayIndex + 1) % 9;
					var clock = BadgeTextManager.get("ScrollingClock");
					if(clock)	clock.update();

					displayTimer = setTimeout(displayLoop, 1000);
				}

				this.update = function(){
					var currentTime = new TimeTZ().emulated;

					BadgeTextManager.set("ScrollingClock", 
						"  " + Formatter.format("twoDigitNum", currentTime.getHours()) + ":" +
						Formatter.format("twoDigitNum", currentTime.getMinutes()) + "  ",
						badgeColor
					);
				};
				this.start = function(){
					if(!started){
						started = true;
						loop();
						displayLoop();
					}
				};
				this.stop = function(){
					if(started){
						started = false;
						clearTimeout(timer);
						clearTimeout(displayTimer);
						BadgeTextManager.remove("ScrollingClock");
					}
				};
			}
		},

		init: function(){
			internal.updatePopup();
			internal.setupIconUpdateLoop();
		},

		setupIconUpdateLoop: function(){
			var timer = 0, paused = false;

			function loop(){
				internal.updateIcon();

				timer = setTimeout(loop, (60 - new Date().getSeconds()) * 1000);
			}

			// set up idle listener
			chrome.idle.onStateChanged.addListener(function(newState){
				if(newState === "locked"){
					log(__NAME__, "Icon update paused at " + new TimeTZ().dateTimeString());
					// stop loop
					clearTimeout(timer);
					paused = true;
				}else if(newState === "active"){
					// continue loop
					if(paused){
						log(__NAME__, "Icon update resumed at " + new TimeTZ().dateTimeString());
						loop();
						paused = false;
					}
				}
			});

			// start loop
			loop();
		},

		/**
		 * Updates icon
		 */
		updateIcon: function(){
			var currentTime = new TimeTZ(),
				clockface = internal.getIconMode(),
				clockDefinition = storage.get("clockDefinition");

			//log(__NAME__, "Updated icon at " + currentTime.dateTimeString());

			// set browser action icon
			switch(clockface.mode){
				case "none":
					// none
					chrome.browserAction.setIcon({
						// generate an empty canvas
						path: Graphics.create(19, 19).render().toDataURL()
					});
					break;

				case "analog":
					// analog
					internal.updateAnalogClock(clockDefinition.analog);
					break;

				case "digit":
				default:
					// digital clock
					internal.updateDigitalClock(clockDefinition.digital);
					break;
			}

			// set browser action title
			chrome.browserAction.setTitle({
				title: currentTime.customString({
					year: "numeric", month: "long", day: "numeric",
					hour: "numeric", minute: "numeric",
					hour12: storage.get("pm"),
					weekday: "long"
				})
			});

			// set badge clock
			internal.badgeClockManager.start(clockface.badge);
		},

		/**
		 * Updates popup page url
		 */
		updatePopup: function(){
			chrome.browserAction.setPopup({
				popup: storage.get("popup_version") ? "/new_popup2.html" : "/popup.html"
			});
		},

		/**
		 * Get browser action icon mode
		 *
		 * @return
		 * mode: 	none - no clockface
		 *       	digit - digital clock
		 *       	analog - analog clock
		 *       	
		 * badge:	none - no badge clock
		 *       	static - static badge clock
		 *       	scroll - scrolling badge clock
		 */
		getIconMode: function(){
			var result = {mode: "none", badge: "none"};

			if(storage.get("use_digit")){
				// Digital
				result.mode = "digit";
			}else{
				// analog
				result.mode = "analog";

				// no icon
				if(!storage.get("icon")){
					result.mode = "none";
				}

				// badge clock
				if(storage.get("badge")){
					if(storage.get("show")){
						// no scroll
						result.badge = "static";
					}else{
						// scroll
						result.badge = "scroll";
					}
				}
			}

			

			return result;
		},

		/**
		 * Update analog clock
		 * @param  {Object} definition Clock definition
		 */
		updateAnalogClock: function(definition){
			definition = applyDefault({
				minY: 0.1,
				hrY: 0.3,
				minColor: "#A7A7A7",
				hrColor: "#808080",
				strokeWidth: 5,
				flatTip: true,
				circleBorder: false,
				circleBorderWidth: 0,
				circleBorderColor: "#6E6E6E",
				background: "transparent",
				clockBg: "transparent",
				notificationBg: true,
				indicationLines: true
			}, definition || {});

			/*
			 * For compatibility reason
			 * Legacy code forced canvas to be 128x128 then scaling it back down.
			 */
			definition.width = 128;
			definition.height = 128;

			// Force viewport to be 19x19 (browser action icon size) or equivalent 
			// regarding client pixel ratio.
			var viewport = Graphics.create(19, 19);
			var scaling = new Graphics.Containers.Transformable(0, 0, 128, 128);
			var model = GraphicsPresets.create("analog-clock", definition);

			// Scale it back down
			scaling.setTransform("scale", {x: 19 / 128, y: 19 / 128});

			// Adding the clock
			viewport.add(scaling);
			scaling.add(model.getEntity());
			model.setTime(new TimeTZ().emulated);

			// Render
			chrome.browserAction.setIcon({
				path: viewport.render().toDataURL()
			});
		},

		/**
		 * Update digital clock
		 * @param  {Object} definition Clock definiton
		 */
		updateDigitalClock: function(definition){
			definition = applyDefault({
				minXY: [8, 32],
				hrXY: [0, 15],
				font: "default",
				hrFontSize: 18,
				minFontSize: 18
			}, definition || {});

			/**
			 * For compatibility reason
			 * Legacy code forced canvas to be 32x32 then scaling it back down.
			 */
			definition.width = 32;
			definition.height = 32;

			definition.textColor = storage.get("clockcolor_value", true);

			// Force viewport to be 19x19 (browser action icon size) or equivalent 
			// regarding client pixel ratio.
			var viewport = Graphics.create(16, 16);
			var scaling = new Graphics.Containers.Transformable(0, 0, 32, 32);
			var model = GraphicsPresets.create("digital-clock", definition);

			// Scale it back down
			scaling.setTransform("scale", {x: 16 / 32, y: 16 / 32});

			// Adding the clock
			viewport.add(scaling);
			scaling.add(model.getEntity());
			model.setTime(new TimeTZ().emulated, storage.get("pm"));

			// Render
			var dict = {};
			dict[(viewport.width).toString()] = viewport.render().toDataURL();
			chrome.browserAction.setIcon({
				path: dict
			});
		}
	};

	var app = {
		updatePopup: function(){
			return internal.updatePopup();
		},
		updateIcon: function(){
			return internal.updateIcon();
		},
		getIconMode: function(){
			return internal.getIconMode();
		},
		badgeClockManager: internal.badgeClockManager
	};

	internal.init();

	return app;
});