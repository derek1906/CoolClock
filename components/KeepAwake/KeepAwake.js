/**
 * Override system power management
 */

Components.define(
	function(log, storage, warn){
		var KEEPAWAKE_STORAGE_NAME = "keepawake";
		var requestedNames = {},
			currentStatus = false,
			allowed = storage.get(KEEPAWAKE_STORAGE_NAME);

		var internal = {
			getNumberOfRequestedNames: function(){
				return Object.keys(requestedNames).length;
			},
			update: function(){
				// update preference
				allowed = storage.get(KEEPAWAKE_STORAGE_NAME);

				/*
					 allowed &&  isRequested &&  currentStatus	// nothing
					 allowed &&  isRequested && !currentStatus	// turn it on
					 allowed && !isRequested &&  currentStatus	// turn it off
					 allowed && !isRequested && !currentStatus	// nothing
					!allowed &&  isRequested &&  currentStatus	// turn it off
					!allowed &&  isRequested && !currentStatus	// nothing
					!allowed && !isRequested &&  currentStatus	// turn it off
					!allowed && !isRequested && !currentStatus	// nothing
				 */

				var isRequested = internal.getNumberOfRequestedNames();
				if(allowed && isRequested && !currentStatus){
					log("KeepAwake", "Keep awake enabled");
					chrome.power.requestKeepAwake("system");
					currentStatus = true;
				}else if(
					( allowed && !isRequested && currentStatus) ||
					(!allowed &&  isRequested && currentStatus) ||
					(!allowed && !isRequested && currentStatus)
				){
					log("KeepAwake", "Keep awake disabled");
					chrome.power.releaseKeepAwake();
					currentStatus = false;
				}
			}
		};

		var app = {
			request: function(name){
				if(name in requestedNames)	return true;

				requestedNames[name] = true;

				log("KeepAwake", "Keep awake enabling requested by \"" + name + "\"");

				internal.update();

				return true;
			},
			release: function(name){
				if(name in requestedNames){
					delete requestedNames[name];

					log("KeepAwake", "Keep awake disabling requested by \"" + name + "\"");

					internal.update();

					return true;
				}
				return false;
			},
			getAllRequestedNames: function(){
				return Object.keys(requestedNames);
			},
			getStatus: function(){
				return currentStatus ? "requested" : "released";
			}
		};

		storage.addListener(KEEPAWAKE_STORAGE_NAME, internal.update);

		return app;
	}
);