var Functions = chrome.extension.getBackgroundPage().Functions,
	Components = chrome.extension.getBackgroundPage().Components;

$(function(){
	// apply translation
	//i18n.translate();
	Components.getSingleton("Localization").translatePage(document);

	// register components
	registerElements({
		"background-shapes": {
			onAttached: function(root){
				/**
				 * Animate background
				 * @param  {obj} points            An array of points
				 * @param  {canvas} canvas            Canvas object from background page
				 * @param  {number or null} previousTimestamp previous timestamp
				 * @param  {number or null} currentTimestamp  current timestamp
				 */
				function animateBackground(points, canvas, previousTimestamp, currentTimestamp){
					var delta = currentTimestamp - previousTimestamp,
						secondPerFrame = 1000 / 60,
						ctx = canvas.getContext("2d");

					ctx.clearRect(0, 0, 300, 500);
					points.forEach(function(point){
						ctx.fillStyle = "rgba(255, 255, 255, " + point.alpha + ")";
						ctx.beginPath();
						ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
						ctx.closePath();
						ctx.fill();

						point.x += (delta / secondPerFrame) * (point.radius / 50);
						point.y += (delta / secondPerFrame) * point.dy;

						if(point.x > 300 + point.radius * 2){
							fillPointWithRandomData(point, true);
						}
					});

					requestAnimationFrame(function(newTimestamp){
						animateBackground(points, canvas, currentTimestamp, newTimestamp);
					});
				}

				/**
				 * Fill an existing point object with random data.
				 * @param  {obj} point  Point object
				 * @param  {boolean} hidden True if the point should not be visible
				 * @return {obj}        Point object
				 */
				function fillPointWithRandomData(point, hidden){
					point.radius = Math.random() * 20;
					point.x = Math.random() * 300;
					point.y = Math.random() * 500;
					point.alpha = Math.random() * 0.05;
					point.dy = Math.random() * 0.25 - 0.25 / 2;

					if(hidden){
						point.x = -point.radius * 2;
					}

					return point;
				}

				// create raw native canvas for performance
				var backgroundCanvas = Components.getSingleton("Graphics").create(300, 500, true);
				var NUM_OF_POINTS = 50, points = [];
				for(var i = 0; i < NUM_OF_POINTS; i++){
					points.push(fillPointWithRandomData({}, false));
				}
				root.appendChild(backgroundCanvas);

				// start animate loop
				animateBackground(points, backgroundCanvas, null, null);
			}
		},
		"title-clock": {
			onAttached: function(root){

				// set up events
				root.getElementById("hours-minutes").addEventListener("click", function(){
					root.getElementById("clockface").classList.toggle("alwaysShowSeconds");
				})

				// start time update loop
				function updateLoop(){
					var time = this.update();

					// set timer for next update
					this.updateTimer = setTimeout(updateLoop.bind(this), 1000 - time.getMilliseconds());
				}
				
				updateLoop.call(this);
			},
			onDetached: function(){
				// stop time update loop
				clearTimeout(this.updateTimer);
			},
			properties: {
				/**
				 * Time update loop
				 */
				update: {
					value: function(){
						function prependZero(number){
							return number < 10 ? "0" + number : number;
						}

						// fill content
						var root = this.shadowRoot;
						var time = Functions.time();
						root.getElementById("hours").textContent = (prependZero(time.pm.enabled ? time.pm.hour : time.hour));
						root.getElementById("minutes").textContent = (prependZero(time.min));
						root.getElementById("seconds").textContent = (prependZero(time.sec));

						if(time.pm.enabled){
							root.getElementById("hours-minutes").setAttribute("data-pm-label", time.pm.label);
						}

						return time.dateObj;
					},
					enumerable: true
				},
				updateTimer: {
					value: 0,
					writable: true
				}
			}
		},
		"title-date": {
			onAttached: function(root){
				function updateLoop(){
					var time = this.update();
					var nextDay = new Date(time);

					// set time for next day
					nextDay.setSeconds(0);
					nextDay.setMinutes(0);
					nextDay.setHours(0);
					nextDay.setDate(time.getDate() + 1);

					this.updateTimer = setTimeout(updateLoop.bind(this), nextDay - time);
				}

				// start update loop
				updateLoop.call(this);
			},
			onDetached: function(){
				// stop update loop
				clearTimeout(this.updateTimer);
			},
			properties: {
				update: {
					value: function(){
						var time = Functions.time();
						this.textContent = this.shadowRoot.getElementById("content").textContent = time.i18n.dateString();

						return time.dateObj;
					}
				},
				updateTimer: {
					value: 0,
					writable: true
				}
			}
		},
		"title-weather": {
			onAttached: function(root){
				var self = this;

				function displayInfo(data){
					var temperatureString = data.temperature.fahrenheit + "°F/ " + data.temperature.celcius + "°C, " + data.condition;

					root.getElementById("city").textContent = data.city;
					root.getElementById("condition").textContent = temperatureString;
					self.textContent = data.city + " " + temperatureString;

					root.getElementById("wrapper").classList.add("loaded", "success");

					self.addEventListener("click", function(){
						chrome.tabs.create({ url: data.link });
					});
				}

				function displayErrorInfo(){
					root.getElementById("city").textContent = "Weather not available.";
					root.getElementById("wrapper").classList.add("loaded");
				}

				Components.depends(function(WeatherHandler, storage){
					if(storage.get("weather").enabled){
						root.getElementById("loading-status").textContent = "Loading weather...";

						WeatherHandler.get(function(result){
							switch(result.status){
								case "success":
								case "cache":
									displayInfo(result.data); break;

								case "failed":
									if(result.data)	displayInfo(result.data);
									else           	displayErrorInfo();
									break;
							}
						});
					}
				});
			}
		},
		"app-list": {
			properties: {
				addItem: {
					value: function(title, message){
						var item = document.createElement("app-list-item");
						item.textContent = title;
						item.setAttribute("message", message);

						this.appendChild(item);
						return item;
					}
				},
				removeItem: {
					value: function(item){
						return this.removeChild(item);
					}
				}
			}
		},
		"app-list-item": {
			onAttached: function(){
				for(var i = 0; i < this.attributes.length; i++){
					var attr = this.attributes[i];
					this._readAttr(attr.name, attr.value);
				}

				this.onload();
			},
			onAttrChanged: function(attr, oldVal, newVal){
				this._readAttr(attr, newVal);
			},
			onDetached: function(){
				this.onunload();
			},
			properties: {
				_readAttr: {
					value: function(attr, value){
						switch(attr){
							case "center":
								this.shadowRoot.getElementById("list-item").classList[value !== null ? "add" : "remove"]("center");
								break;
							case "message":
								this.shadowRoot.getElementById("message").textContent = value;
								break;
							case "label":
								if(value){
									this.shadowRoot.getElementById("list-item").setAttribute("data-label", value);
								}else{
									this.shadowRoot.getElementById("list-item").removeAttribute("data-label");
								}
						}
					}
				},
				onload: {
					get: function(){
						return this._onload || function(){};
					},
					set: function(callback){
						if(typeof callback !== "function")	return undefined;

						this._onload = callback;
						if(this._attached)	this.onload();

						return this.onload;
					}
				},
				onunload: {
					get: function(){
						return this._onunload || function(){};
					},
					set: function(callback){
						if(typeof callback !== "function")	return undefined;

						this._onunload = callback;

						return this.onunload;
					}
				}
			}
		}
	});


	// events
	$("#app-more, #bottom-sheet-backdrop").click(function(){
		$("#bottom-sheet-wrapper").toggleClass("hidden");
	});

	// bottom sheet actions
	$("#action-statistics").click(function(){
		chrome.tabs.create({ url: "/statistics.html" })
	});
	$("#action-settings").click(function(){
		//chrome.tabs.create({ url: "/options_new.html" });
		chrome.runtime.openOptionsPage();
	});
	$("#action-help").click(function(){
		chrome.tabs.create({
			url: "https://docs.google.com/document/d/1BhBnW1-mzGExFMwz7RtccqRGV6tvnzA1D7ZnyTqf5A8/pub"
		});
	});
	$("#action-forum").click(function(){
		chrome.tabs.create({
			url: "https://groups.google.com/forum/#!forum/chrome-clock"
		});
	})
	$("#action-about").click(function(){
		chrome.tabs.create({ url: "/about.html" });
	});


	// statuses
	document.getElementById("alarm-status").onload = function(){
		var self = this,
			alarms = [],
			AlarmClock = Components.getSingleton("AlarmClock");

		function update(){
			if(alarms.length === 0){
				self.removeAttribute("label");
				self.setAttribute("message", "Set a new alarm");
			}else{
				self.setAttribute("message", "Next alarm at " + alarms[0].getNextScheduledTime().timeString());
			}
		}

		function loadAlarms(){
			alarms = AlarmClock.getActiveAlarms().sort(function(a, b){
				return a.getNextScheduledTime().emulated - b.getNextScheduledTime().emulated;
			});

			self.setAttribute("label", alarms.length);
		}

		loadAlarms();
		update();

		window.addEventListener("storage", function(e){
			if(e.key === "alarm"){
				loadAlarms();
				update();
			}
		});

		// register event
		this.addEventListener("click", function(){
			AlarmClock.displayUI();
		});
	};

	document.getElementById("countdown-status").onload = function(){
		var self = this,
			countdowns = [],
			CountdownTimer = Components.getSingleton("CountdownTimer");

		function update(){
			if(countdowns.length === 0){
				// countdowns not found
				self.setAttribute("message", "Set a countdown timer");
				self.removeAttribute("label");
				return;
			}

			self.setAttribute("message", "Remaining: " + CountdownTimer.getNextScheduledTimer().getRemainingString());

			var now = new Date();
			setTimeout(update, 1000 - now.getMilliseconds());
		}

		function loadCountdowns(){
			countdowns = CountdownTimer.getAll();

			self.setAttribute("label", countdowns.length);
		}

		window.addEventListener("storage", function(e){
			if(e.key === "countdown"){
				loadCountdowns();
			}
		});

		loadCountdowns();
		update();

		this.addEventListener("click", function(){
			CountdownTimer.displayUI();
		});
	};

	document.getElementById("stopwatch-status").onload = function(){
		var self = this,
			timestamp = localStorage["timer_timestamp"],
			paused_timestamp = localStorage["timer_paused_timestamp"],
			originalStartTime = localStorage["timer_ori_timestamp"];

		function formatTime(sec){
			sec = Math.ceil(sec);

			var h = (sec / 3600) |0,
				m = (sec % 3600 / 60) |0,
				s = sec % 3600 % 60;

			return (h? (h+":"+(m<10?"0":"")):"") + m + ":" + ("0"+s).substr(-2);
		}

		function update(){
			self.setAttribute("message", "Timer: " + formatTime((Date.now() - timestamp)/1000) + "s");
			setTimeout(update, 10);
		}

		if(timestamp){
			// stopwatch is going
			
			timestamp = +timestamp;

			if(paused_timestamp){
				// stopwatch is paused
				self.setAttribute("message", "Timer: " + ((+paused_timestamp - timestamp)/1000).toFixed(2) + "s");
			}else{
				// stopwatch is not paused
				update();
			}

			//this.setAttribute("message", "Started at " + Functions.time(false, new Date(+originalStartTime)).i18n.timeString());
			this.setAttribute("label", "1");
		}else{
			// stopwatch is not going
			this.setAttribute("message", "Start stopwatch")
		}

		// register click
		this.addEventListener("click", function(){
			//chrome.extension.getBackgroundPage().timer();
			Components.getSingleton("Stopwatch").displayUI();
		});
	};

	document.getElementById("calendar-status").onload = function(){

		function prependZero(number){
			return number < 10 ? "0" + number : number;
		}

		var date = Functions.time(),
			dateKey = "" + date.year + prependZero(date.month + 1) + prependZero(date.date),
			ongoingEvents = JSON.parse(localStorage["todo"])[dateKey];

		if(ongoingEvents && ongoingEvents.length){
			// events found for today
			this.setAttribute("label", ongoingEvents.length);
			this.setAttribute("message", ongoingEvents.length + " events: \"" + ongoingEvents[0].text + "\"");
		}else{
			// events not found
			this.setAttribute("message", "Set todos in Calendar");
		}

		// register click
		this.addEventListener("click", function(){
			chrome.tabs.create({ url: "/calendar_full.html" });
		});
	};

});

function registerElements(elements){
	for(var element_name in elements){
		(function(definition){
			var proto = Object.create(definition.inheritFrom ? definition.inheritFrom.prototype : HTMLElement.prototype, {
				createdCallback: {
					value: function(){
						var template = document.getElementById(element_name),
							copy = document.importNode(template.content, true);
						this.createShadowRoot().appendChild(copy);

						if(definition.onCreated)	definition.onCreated.call(this);
					}
				},
				attachedCallback: {
					value: function(){
						this._attached = true;
						if(definition.onAttached)	definition.onAttached.call(this, this.shadowRoot);
					}
				},
				detachedCallback: {
					value: function(){
						this._attached = false;
						if(definition.onDetached)	definition.onDetached.call(this, this.shadowRoot);
					}
				},
				attributeChangedCallback: {
					value: function(attr, oldVal, newVal) {
						if(definition.onAttrChanged)	definition.onAttrChanged.call(this, attr, oldVal, newVal);
					}
				},
				_attached: {
					value: false,
					writable: true
				}
			});

			if(definition.properties)	Object.defineProperties(proto, definition.properties);

			document.registerElement(element_name, {prototype: proto});
		})(elements[element_name]);
	}
}
