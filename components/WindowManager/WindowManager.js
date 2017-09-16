/**
 * Manages windows
 */

Components.define(
	function(argFormatter, storage, log){
		var WINDOW_SIZES_MEMORY_STORAGE_NAME = "windowSizeMemory";
		var openedWindows = {};

		function recordOpenWindow(openedWindow, url){
			openedWindows[url] = openedWindow;

			log("WindowManager", "Opened \"" + url + "\"");
		}

		function openWindow(options){
			// create window
			chrome.windows.create(options, function(openedWindow){
				recordOpenWindow(openedWindow, options.url);
			});
		}

		var app = {
			create: function(){
				var input = argFormatter(arguments, {
					name: "WindowManager.create",
					definition: [
						{name: "url", type: "string"},
						{name: "options", type: "object", optional: true, default: {}},
						{name: "allowMultiple", type: "boolean", optional: true, default: false}
					]
				}, true);

				var args = input.arguments;

				args.url = chrome.extension.getURL(args.url).split("#")[0];
				var memory = storage.get(WINDOW_SIZES_MEMORY_STORAGE_NAME)[args.url];

				// default values
				args.options = $.extend({
					type  	: "popup",
					url   	: "about:blank",
					width 	: 785,
					height	: 490,
					left  	: undefined,
					top   	: undefined
				}, 
				args.options, {
					url   	: args.url,
					width 	: memory ? memory.size[0] : undefined,
					height	: memory ? memory.size[1] : undefined,
					left  	: memory ? memory.location[0] : undefined,
					top   	: memory ? memory.location[1] : undefined
				});


				if(args.allowMultiple || !(args.url in openedWindows)){
					openWindow(args.options);
					return;
				}else{
					chrome.windows.get(openedWindows[args.url].id, function(){
						if(chrome.runtime.lastError){
							// window is not opened
							openWindow(args.options);
						}else{
							// window is opened
							app.focus(args.url);
						}
					});
					return;
				}
			},
			focus: function(){
				var input = argFormatter(arguments, {
					name: "WindowManager.create",
					definition: [
						{name: "url", type: "string"}
					]
				}, true);

				var args = input.arguments;

				var openedWindow = openedWindows[args.url];

				if(!openedWindows)	return;

				chrome.windows.update(openedWindow.id, {focused: true});
			},
			registerOnClose: function(winGlobal){
				var fullpath = chrome.extension.getURL(winGlobal.location.pathname);
				log("WindowManager", "Window \"" + fullpath + "\" onbeforeunload event received");

				delete openedWindows[fullpath];

				storage.set(WINDOW_SIZES_MEMORY_STORAGE_NAME, function(memory){
					memory[fullpath] = {
						location: [winGlobal.screenX, winGlobal.screenY],
						size: [winGlobal.outerWidth, winGlobal.outerHeight]
					};

					return memory;
				});
			},

			// misc
			displayAbout: () => chrome.tabs.create({ url: "about.html" })
		};

		return app;
	}
);
