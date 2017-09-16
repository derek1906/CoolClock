/**
 * Custom i18n solution
 */

Components.define(function(argFormatter, storage){

	var internal = {
		defaultLanguage: "en",
		supportedLanguages: [
			"ar", "bg", "ca", "cs", "de", "el", "en",
			"es", "fi", "fr", "he", "hu", "id", "it",
			"ja", "ko", "nb", "nl", "pl", "pt-BR", "pt-PT",
			"ro", "ru", "sr", "tr", "vi", "zh-CN", "zh-TW"
		],

		/** storage for caching messages */
		loadedMessages: {},

		/**
		 * Check if the set of messages of the specified language is cached.
		 * @param  {string} language Language to be checked
		 * @return {boolean}          True if the language is cached.
		 */
		checkIfLanguageLoaded: function(language){
			return language in internal.loadedMessages;
		},

		/**
		 * Cache the set of messages of a certain language.
		 * @param  {string}   language Language code
		 * @param  {Function} callback Function to be called when the langauge is cached (or failed)
		 * @param  {boolean}   async    Use async XHR or not. Default to be true.
		 */
		cacheMessages: function(language, callback, async){
			if(async === undefined)	async = true;

			if(internal.checkIfLanguageLoaded(language)){
				callback({status: "ok"});
				return;
			}

			if(internal.supportedLanguages.indexOf(language) < 0){
				callback({status: "failed"});
				return;
			}

			var request = new XMLHttpRequest();
			request.open("GET", chrome.extension.getURL("/_locales/" + language.replace(/-/g, "_") + "/messages.json"), async);
			request.onload = function(){
				if(this.status === 200){
					var response = this.responseText.replace(/\/\*.+\*\//g, "");
					internal.loadedMessages[language] = JSON.parse(response);
					callback({status: "ok"});
				}else{
					callback({status: "failed"});
				}
			};
			request.onerror = function(){
				callback({status: "failed"});
			};
			request.send();
		}
	};

	var app = {
		/**
		 * Returns the language chosen by the user or returns the default language
		 * if none is specified.
		 * @return {string} Language code
		 */
		getSelectedLanguage: function(){
			return storage.get("language", true) || internal.defaultLanguage;
		},

		/**
		 * Set selected language.
		 * @param {string} language Language to be set to
		 * @return {boolean} True if the operation is successful
		 */
		setSelectedLanguage: function(language){
			argFormatter(arguments, {
				name: "Localization.setSelectedLanguage",
				definition: [{name: "language", type: "string"}]
			}, true);

			if(internal.supportedLanguages.indexOf(language) > -1){
				storage.set("language", language, true);

				// update menu item labels
				chrome.contextMenus.removeAll();
				chrome.extension.getBackgroundPage().createMenuItem();

				return true;
			}

			return false;
		},

		/**
		 * Get a message of a specified language.
		 * @param {string} [language] Language, optional, defaults to the default language
		 * @param {string} messageName The name of the message to be fetched
		 * @param {callback} [callback] Callback function. If callback is defined, fetching will be done in async.
		 * @return {string} Returns the message if the operation is done in a synchronous fashion.
		 */
		getMessage: function(){
			var input = argFormatter(arguments, {
				name: "i18n.getMessage",
				definitions: {
					"sync": [
						{name: "language", type: "string", optional: true, default: app.getSelectedLanguage()},
						{name: "messageName", type: "string"}
					],
					"async": [
						{name: "language", type: "string", optional: true, default: app.getSelectedLanguage()},
						{name: "messageName", type: "string"},
						{name: "callback", type: "function"}
					]
				}
			}, true), args = input.arguments;

			// synchronous (temporary solution)
			if(input.definition === "sync"){
				try{
					internal.cacheMessages(args.language, function(){}, false);
				}catch(err){
					// catch loading errors
				}
				if(!internal.checkIfLanguageLoaded(args.language)){
					// language is not available
					return app.getMessage(internal.defaultLanguage, args.messageName);
				}

				var messages = internal.loadedMessages[args.language];
				if(args.messageName in messages){
					// message found
					return messages[args.messageName].message;
				}else if(args.language === internal.defaultLanguage){
					// message not found and is already the default language
					return "";
				}else{
					// message not found in current language, try default language
					return app.getMessage(internal.defaultLanguage, args.messageName);
				}
			}

			// asynchronous
			internal.cacheMessages(args.language, function(result){
				if(result.status === "failed"){
					// language is not available
					app.getMessage(internal.defaultLanguage, args.messageName, args.callback);
					return;
				}

				var messages = internal.loadedMessages[args.language];
				if(args.messageName in messages){
					// message found
					args.callback(messages[args.messageName].message);
				}else if(args.language === internal.defaultLanguage){
					// message not found and is already the default language
					args.callback("");
				}else{
					// message not found in current language, try default language
					app.getMessage(internal.defaultLanguage, args.messageName, args.callback);
				}
			});
		},

		/**
		 * Returns a localized name of a specified weekday.
		 * @param {number} weekday 0 thru 6, 0 refers to Sunday, 6 refers to Saturday
		 * @param {boolean} longFormat True if long form is perfered. Defaults to true.
		 * @return {string} Weekday name
		 */
		getWeekdayName: function(){
			var input = argFormatter(arguments, {
				name: "Localization.getWeekdayName",
				definition: [
					{name: "weekday", type: "number"},
					{name: "longFormat", type: "boolean", optional: true, default: true}
				]
			}, true), args = input.arguments;

			var currentDate = new Date();
			currentDate.setDate(currentDate.getDate() + (args.weekday % 7) - currentDate.getDay());
			return Intl.DateTimeFormat(
					app.getSelectedLanguage(), 
					{weekday: args.longFormat ? "long" : "short"}
				).format(currentDate);
		},

		/**
		 * Apply localization on an HTML document when passed a document object.
		 * @param  {HTMLDocument} $doc Document to be translated
		 */
		translatePage: function($doc){
			argFormatter(arguments, {
				name: "Localization.translatePage",
				definition: [{name: "$doc", type: "HTMLDocument"}]
			}, true);

			var formatters = {
				wk: weekday => app.getWeekdayName(+weekday, false),
				wkl: weekday => app.getWeekdayName(+weekday, true)
			};

			// asynchronously translate a message
			// Returns a promise
			function translate(name){
				return new Promise(function(resolve){
					if(name.indexOf(":") > -1){
						var parts = name.split(":"),
							[formatterName, ...formatterArgs] = parts,
							formatter = formatters[formatterName];

						if(formatter)	resolve(formatters[parts[0]].apply(null, formatterArgs));
						else         	resolve("");
					}else{
						app.getMessage(name, function(text){
							resolve(text);
						});
					}
				});
			}

			// replace all text content of tags with "trans" attribute
			var transElements = $doc.querySelectorAll("*[trans]");
			[].forEach.call(transElements, function(element){
				translate(element.getAttribute("trans")).then(text => element.textContent = text);
			});

			// replace all attributes
			var elements = $doc.querySelectorAll("body *");
			var REPLACER_REGEX = /%(.+?)%/;
			[].forEach.call(elements, function(element){
				// for all elements
				[].forEach.call(element.attributes, function(attr){
					// for all attributes
					if(REPLACER_REGEX.test(attr.value)){
						// needs replacing
						var text = attr.value, regex = new RegExp(REPLACER_REGEX, "g"), match,
						    prevIndex = 0, promises = [];

						// build replacement list
						while(match = regex.exec(text)){
						    promises.push(text.slice(prevIndex, match.index), translate(match[1]));
						    prevIndex = regex.lastIndex;
						}
						promises.push(text.slice(prevIndex));

						// resolve all promises
						Promise.all(promises).then(parts => attr.value = parts.join(""));
					}
				});
			});
		}
	};

	return app;
});