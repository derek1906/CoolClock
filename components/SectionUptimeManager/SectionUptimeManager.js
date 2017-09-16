/**
 * Statistics
 */

Components.define(
	function(log, storage, alarms){
		var UPDATE_LOOP_ALARM_NAME = "section-uptime-manager-update-loop-interval";

		var internal = {
			updateLoopInterval: 5,
			lastUpdateTime: null,
			initTime: null,

			init: function(){
				// store initTime
				internal.initTime = Date.now();

				// store statistics from previous section into database
				var db = openDatabase('DB', '1.0', 'my database', 2 * 1024 * 1024);
				db.transaction(function (tx) {
					tx.executeSql('CREATE TABLE IF NOT EXISTS section_uptime (ms,timestamp)');

					var lastUpdateFromPreviousSection = storage.get("section_uptime");
					if(lastUpdateFromPreviousSection){
						var ms = lastUpdateFromPreviousSection.ms,
							timestamp = lastUpdateFromPreviousSection.ts;

						tx.executeSql('INSERT INTO section_uptime VALUES ('+ ms +','+ timestamp+')',[],function(tx,r){});
						storage.remove("section_uptime");
					}else{
						log("SectionUptimeManager", "Cannot find update from previous section.");
					}

					// set update loop
					internal.setupUpdateLoop();
				});

				// setup onunload listener
				window.onunload = function(){
					var currentTime = Date.now();
					storage.set("section_uptime", {
						ms: currentTime - internal.initTime,
						ts: currentTime
					});
				};
			},
			setupUpdateLoop: function(){
				if(storage.get("sectionuptimedata")){

					// perform initial update
					app.update();

					// register period alarm
					alarms.create(UPDATE_LOOP_ALARM_NAME, {
						periodInMinutes: internal.updateLoopInterval
					}, app.update);

					// onbeforeunload
					window.addEventListener("onbeforeunload", app.update());
				}
			}
		};

		var app = {
			/** Update uptime info */
			update: function(){
				var currentTime = Date.now(),
					lastUptimeDataContainer = {};

				lastUptimeDataContainer.ts = currentTime;
				lastUptimeDataContainer.ms = currentTime - internal.initTime;

				storage.set("section_uptime", lastUptimeDataContainer);
				internal.lastUpdateTime = currentTime;
			},
			/** Get the time when update was last ran */
			getLastUpdateTime: function(){
				return new Date(internal.lastUpdateTime);
			},
			/** Get the time when init was ran */
			getInitTime: function(){
				return new Date(internal.initTime);
			},
			/** Get current runtime in milliseconds */
			getCurrentRuntime: function(){
				return Date.now() - internal.initTime;
			}
		};

		internal.init();

		return app;
	}
);