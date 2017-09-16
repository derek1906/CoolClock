/**
 * Storage
 */

Components.define(
	function(argFormatter){
		window.addEventListener("storage", function(e){
			var key = e.key,
				listeners = internal.listeners[key];
			if(listeners){
				listeners.forEach(function(listener){
					listener(e);
				});
			}
		});

		var internal = {
			listeners: {}
		};

		var app = {
			get: function(key, rawOutput){
				var value = localStorage.getItem(key);

				if(rawOutput)          	return value;
				else if(value === null)	return null;
				else                   	return JSON.parse(value);
			},
			set: function(){
				var input = argFormatter(arguments, {
					name: "storage.set",
					definitions: {
						"storage-modification": [
							{name: "key", type: "string"},
							{name: "modificationCall", type: "function"},
							{name: "rawInput", type: "boolean", optional: true, default: false}
						],
						"single-value": [
							{name: "key", type: "string"},
							{name: "value", type: "*"},
							{name: "rawInput", type: "boolean", optional: true, default: false}
						]
					}
				}, true), args = input.arguments;

				switch(input.definition){
					case "storage-modification":
						var value = app.get(args.key, args.rawInput),
							returnedNewValue = args.modificationCall(value);

						app.set(args.key, returnedNewValue, args.rawInput);
						break;

				    case "single-value":
						if(args.rawInput)	localStorage.setItem(args.key, args.value);
						else             	localStorage.setItem(args.key, JSON.stringify(args.value));

						break;
				}
			},
			remove: function(name){
				localStorage.removeItem(name);
			},
			addListener: function(key, callback){
				argFormatter(arguments, {
					name: "storage.addListener",
					definition: [
						{name: "key", type: "string"},
						{name: "callback", type: "function"}
					]
				}, true);

				var listeners = internal.listeners;
				if(!listeners[key])	listeners[key] = [];

				listeners[key].push(callback);
			}
		};

		return app;
	}
);