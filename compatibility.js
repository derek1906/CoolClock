var runCompatibilityCheck = {
	init : function(){
		this.defineDefaultSettings();
		this.alarmOldtoNew();
		this.todoOldtoNew();
		this.checkvoice();
		this.checkWeather();
		this.checkAlarm();
	},
	//convert old format alarm to new
	alarmOldtoNew : function(){
		!localStorage["alarm"] && (localStorage["alarm"]="[]");  //create key if not exist
		var list = JSON.parse(localStorage["alarm"]);
		
		for(var i=0;i<localStorage.length;i++){  //Loop through local storage
			var key = localStorage.key(i),
				value = localStorage[key];
				
			if( /^alarm[o|d]\d{4}$/.test(key) ){  //found alarm item
				var textKey = "text_" + key,
					textValue = localStorage[textKey],
					obj = {},
					hour = parseInt(key.match(/alarm[o|d](\d{2})\d{2}/)[1],10),
					min = parseInt(key.match(/alarm[o|d]\d{2}(\d{2})/)[1],10),
					type = "o";
					
				if( textValue == undefined){
					textValue = "";
				}
				if( key.search(/^alarmo/) == -1){
					type = "d";
				}
				obj = {  //alarm object
					hour : hour,
					min : min,
					type : type,
					text : textValue,
					rang : false,
					day : [],
					id: Math.floor(Math.random()*1e10),
					off: false
				};
				list.push(obj);
				localStorage.removeItem(key);
				localStorage.removeItem(textKey);
			}else{
				continue;
			}
		}
		localStorage["alarm"] = JSON.stringify(list);  //enter items in the list
	},
	checktimezone: function(){
		var today = new Date(),
			gmtHours = getCurrenttimezone(today);
		if(Number(localStorage["firsttimezone"])!=Number(gmtHours)){
			if(confirm("Your computer's timezone has been changed.\nDo you want to change the extension's timezone to "+gmtHours+"?\n\n* Usually this is caused by day-light saving.")){
				localStorage["timezone"]=gmtHours;
			}
		}
		localStorage["firsttimezone"]=gmtHours;
	},
	checkvoice: function(){
		var obj = JSON.parse(localStorage["voice"]),
			exist = false;
		chrome.tts.getVoices(function(voices){
		   	for(var i=0;i<voices.length;i++){
		   		(voices[i].voiceName == obj.voiceName) && (exist = true);
		   	}
		   	if(!exist){
		   		obj.voiceName = "native";
		   		localStorage["voice"] = JSON.stringify(obj);
		   	}
		});		
	},
	todoOldtoNew: function(){
		for(var key in localStorage){
		 	if(key != "todo" && key.slice(0,4) == "todo"){
		 		var string = key.slice(4),
		 			year = new Date().getFullYear(),
		 			month = new Date().getMonth(),
		 			date = +string.replace(month+1,"");
		 		
		 		month = (month+1).addZero();
		 		date = date.addZero();
		 		
		 		var obj = JSON.parse(localStorage["todo"]);
		 		if(!obj[""+year+month+date]){
		 			obj[""+year+month+date] = [];
		 		}
		 		obj[""+year+month+date].push({
		 			text: localStorage[key],
		 			id: +new Date(),
		 			importFrom: "Todo saved in old format"
		 		});
		 		
		 		localStorage.removeItem(key);
		 		
		 		localStorage["todo"] = JSON.stringify(obj);
		 	}
		}		
	},
	checkWeather: function(){
		var list = JSON.parse(localStorage["weather"]);
		if(typeof list.woeid == "undefined"){
			delete list.enabled;
		}
		localStorage["weather"] = JSON.stringify(list);
	},
	defineDefaultSettings : function(){
		if(localStorage["enabletimezone"] == "true"){
			this.checktimezone();
		}
		if(localStorage["clockcolor_enable"] == "false"){
			  localStorage["clockcolor_enable"] = "true";
			  alert("Cool Clock...\n\nYou can now change the font color without having the font installed.");
		}
		
		this.tools.createDefault({
			"use_digit": "true",
			"badge": "false",
			"icon": "true",
			"pm": "true",
			"show": "false",
			"use_dark_mode": "false",
			"shownotification": "true",
			"shownotificationtime": "7",
			"shownotificationtodo":"true",
			"showupdate": "true",
			"timeupdateicon": "5",
			"ringtone": "default",
			"ring_loop": "false",
			"noti_sound": "none",
			"timezone": function(){
				localStorage["timezone"] = localStorage["firsttimezone"] = getCurrenttimezone();
			},
			"firsttimezone": getCurrenttimezone(),
			"enabletimezone": "false",
			"popup_rc_close": "false",
			"clockcolor_enable": "true",
			"clockcolor_value": "#000000",
			"manuallyclosenoti": "false",
			"lunar": "false",
			"dateorder": '{"1":"Date","2":"Month","3":"Year"}',
			"syncdataGC": "false",
			"sectionuptimedata": "true",
			"context_menu_item_enable": "true",
			"alarm": "[]",
			"countdown": "[]",
			"voice": JSON.stringify({
				voiceName: "native",
				speed: 0.7
			}),
			"bg_run": "false",
			"weather": '{"enabled":false,"woeid":"2459115"}',
			"todo": '{}',
			"popup_version": "1",  //1: new, 0: old
			"noti_voice": '{"enabled":false,"text": "It is %h %P."}',
			"badge_color": "#428bca",
			"windowSizeMemory": "{}",
			"clockDefinition": JSON.stringify({
				analog: {
					width: 19,
					height: 19,
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
				},
				digital: {
					width: 19,
					height: 19,
					minXY: [8, 32],
					hrXY: [0, 15],
					font: "default",
					hrFontSize: 18,
					minFontSize: 18
				}
			}),
			"noti_style": "default",
			"noti_bgColor": "#0772a1",
			"keepawake": true
		});
	},
	tools: {
		createDefault: function(obj){
			switch(typeof obj){
				case "object":
					if(Object.prototype.toString.apply(obj) === "[object Array]"){
						//array
						for(var i=0;i<obj.length;i++){
							if(localStorage[obj[i]] == null){
								localStorage[obj[i]] = "[]";
							}
						}
					}else{
						//object
						for(var key in obj){
							if(localStorage[key] == null){
								switch(typeof obj[key]){
									case "function":
										obj[key]();
										break;
									default:
										localStorage[key] = obj[key];
										break;
								}
							}
						}
					}
					break;
				case "text":
					if(localStorage[obj] == null){
							localStorage[obj] = "[]";
					}
					break;
			}
		}
	},
	checkAlarm: function(){
		chrome.extension.getBackgroundPage().Functions.ls("alarm").modify(function(){
			for(var i = 0; i < this.length; i++){
				this[i] = $.extend({
					hour: 0,
					min: 0,
					type: "o",
					text: "",
					rang: false,
					day: [],
					id: Math.floor(Math.random()*1e10),
					off: false
				}, this[i]);
			}
		});
	}
}
