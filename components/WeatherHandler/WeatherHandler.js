/**
 * Handles weather requests
 */

Components.define(
	function(log, warn, storage, argFormatter){

		var internal = {
			Enums: {
				STATUS_SUCCESS: "success",
				STATUS_CACHE: "cache",
				STATUS_FAILED: "failed",
				STATUS_DISABLED: "disabled"
			},
			cache: {
				data: undefined,
				lastUpdated: null
			},
			needsUpdate: function(){
				var currentTime = Date.now();

				return	(currentTime - internal.cache.lastUpdated) > 1 * 60 * 60 * 1000 ||	// last update longer than 1 hour ago
				      	storage.get("weather").woeid !== internal.cache.data.woeid;       	// location has been changed
			},
			updateCache: function(callback){
				var location = storage.get("weather").woeid;

				function weatherSuccess(data){
					if(!data.query.results){
						weatherFail(undefined, 0);
						return;
					}

					var weather = data.query.results.channel;

					internal.cache.data = {
						woeid: location,
						temperature: {
							fahrenheit	: +weather.item.condition.temp,
							celcius   	: Math.round((+weather.item.condition.temp - 32) / 1.8)
						},
						code: +weather.item.condition.code,
						condition: weather.item.condition.text,
						conditionIconChar: internal.getCodeIconChar(+weather.item.condition.code),
						city: weather.location.city,
						link: weather.item.link,
						raw: weather
					};

					internal.cache.lastUpdated = Date.now();

					callback($.extend({status: internal.Enums.STATUS_SUCCESS}, internal.cache));
				}

				function weatherFail(e, statusCode){
					warn("WeatherHandler", "Failed to update weather");

					callback($.extend({status: internal.Enums.STATUS_FAILED}, internal.cache));
				}

				$.ajax({
				   	url: "https://query.yahooapis.com/v1/public/yql?q=select * from weather.forecast where woeid=" + location + "&format=json&u=f",
				   	dataType: "json",
				   	success: weatherSuccess,
				   	error: function(e){
				   		weatherFail(e, e.statusCode());
				   	}
				});	
			},
			getCodeIconChar: function(code){
				var icon = "";
				switch(code){
					case 1:                                        	icon = "\uE829"; break;	//tropical storm
					case 3:                                        	icon = "\uE82F"; break;	//severe thunderstorm
					case 4:case 37:case 38:case 39:case 45:case 47:	icon = "\uE824"; break;	//thunderstorm
					case 5:case 6:case 7:case 35:                  	icon = "\uE82C"; break;	//snow and rain
					case 8:case 9:case 40:                         	icon = "\uE826"; break;	//small rain
					case 10:case 11:case 12:                       	icon = "\uE827"; break;	//rain
					case 13:case 14:case 15:case 17:case 18:       	icon = "\uE82D"; break;	//light snow
					case 16:case 46:                               	icon = "\uE82B"; break;	//snow
					case 19:case 22:                               	icon = "\uE822"; break;	//dust
					case 20:case 21:                               	icon = "\uE821"; break;	//foggy
					case 23:case 24:                               	icon = "\uE81B"; break;	//blustery
					case 25:                                       	icon = "\uE81C"; break;	//cold
					case 26:case 27:case 28:                       	icon = "\uE82E"; break;	//cloudy
					case 29:                                       	icon = "\uE81E"; break;	//partly cloudy night
					case 30:                                       	icon = "\uE81D"; break;	//partly cloudy day
					case 31:case 33:                               	icon = "\uE818"; break;	//clear night
					case 32:case 34:                               	icon = "\uE817"; break;	//sunny
					case 36:                                       	icon = "\uE808"; break;	//hot
					case 43:                                       	icon = "\uE82C"; break;	//heavy snow
					case 44:                                       	icon = "\uE823"; break;	//partly cloudy
				}

				return icon;
			}
		};

		var app = {
			get: function(){
				var input = argFormatter(arguments, {
					name: "WeatherHandler.get",
					definition: [
						{name: "requireLatest", type: "boolean", optional: true, default: false},
						{name: "callback", type: "function"}
					]
				}, true),
					args = input.arguments;

				if(!storage.get("weather").enabled){
					// no weather available
					args.callback({ status: internal.Enums.STATUS_DISABLED });
					return;
				}

				if(args.requireLatest || internal.needsUpdate()){
					internal.updateCache(args.callback);
				}else{
					args.callback($.extend({ status: internal.Enums.STATUS_CACHE }, internal.cache));
				}
			},
			getLatest: function(callback){
				app.get(true, callback);
			},
			isEnabled: function(){
				return storage.get("weather").enabled;
			}
		};

		return app;
	});