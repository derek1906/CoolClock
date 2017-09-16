/**
 * Beware - Extremely old code ahead
 *
 * Use the Localization component instead.
 */

var languages=[
		"en",
		"zh-TW",
		"es",
		"ru",
		"nl",
		"pt-BR",
		"zh-CN",
		"fr",
		"he",
		"de",
		"pt-PT",
		"cs",
		"ro",
		"pl",
		"it",
		"fi",
		"tr",
		"id",
		"ja",
		"ko",
		"ca",
		"nb",
		"ar",
		"el",
		"hu",
		"vi",
		"bg",
		"sr"
	];

if(localStorage["language"] == null){
	var lang = processLanguageCode(navigator.language);
	if( ["zh-CN", "zh-TW", "pt-BR", "pt-PT"].indexOf(lang) === -1 ){
		lang = lang.slice(0,2);
	}
	if(languages.indexOf(lang) === -1){
		lang = "en";
	}
	/*
	for(i = 0; i < languages.length; i++){
		if(lang == languages[i]){
			break;
		}
		if(i == languages.length){
			lang = "en";
		}
	}
	*/
	localStorage["language"] = lang;
}

function processLanguageCode(code){
	/*
	if(code.indexOf("-") > 0){
		var opt = code.split("-");
		opt[0] = opt[0].toLowerCase();
		opt[1] = opt[1].toUpperCase();
		return opt.join("-");
	}else{
		return code.toLowerCase();
	}*/
	return chrome.i18n.getUILanguage();
}

function i18n(key,lang){
	if(window.Components && Components.getSingleton("Localization")){
		if(lang){
			return Components.getSingleton("Localization").getMessage(lang, key);
		}else{
		 	return Components.getSingleton("Localization").getMessage(key);
		}	
	}

	// fallback to old code
	var querylang = localStorage["language"],
		text = "";

	if(typeof(lang) != "undefined"){
		querylang = lang;
	}

	var xhr = new XMLHttpRequest();	
	xhr.open("GET", chrome.extension.getURL("/_locales/"+querylang.replace(/\-/g,"_")+"/messages.json"), false);
	xhr.onreadystatechange = function(){
		if(this.readyState == 4){
			var translations = JSON.parse(this.responseText.replace(/\/\*.+\*\//g, ""));
			if(!(translations[key]) || translations[key]["message"] == ""){
				//Test if there is translation for this word
				try{
					//If no, Use English
					if(querylang != "en"){
						text = i18n(key,"en");
					}else{
						text = "ERROR"
					}
				}catch(err){
					//English does not have this word also. (error)
					text = "ERROR"
				}
			}else{
				text = translations[key]["message"]
			}
		}
	};
	
	try{
		//Test if there is translation for this language
		xhr.send();
	}catch(err){
		if(err.code == 101){
			//If no, use English
			text = i18n(key,"en");
		}
	}

	return text;
}

i18n.lang = function(){
	return localStorage["language"];
}

i18n.dateString = function(date){
	return Intl.DateTimeFormat(i18n.lang(),{day:"numeric",month:"long",year:"numeric"}).format(date);
}
i18n.timeString = function(date){
	return Intl.DateTimeFormat(i18n.lang(),{hour:"numeric",minute:"numeric",hour12:localStorage["pm"]==="true"}).format(date);
}
i18n.dateTimeString = function(date){
	return Intl.DateTimeFormat(i18n.lang(),{
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "numeric",
		minute: "numeric",
		hour12: localStorage["pm"]==="true",
		second: "numeric"
	}).format(date);
}
i18n.customString = function(obj, date){
	return Intl.DateTimeFormat(i18n.lang(),obj).format(date);
}

i18n.translate = function(ctx){
	var $ = $ || chrome.extension.getBackgroundPage().$,
		ctx = ctx || document;
	$("*[trans]", ctx).each(function(){
		var value = $(this).attr("trans");
		if(value.indexOf(":")!==-1){
			var ns = value.split(":");
			switch(ns[0]){
				case "wk":
					var date = new Date();
					date.setDate(date.getDate()+parseInt(ns[1], 10)-date.getDay());
					value = Intl.DateTimeFormat(i18n.lang(), {weekday: "short"}).format(date);
					break;
				case "wkl":
					var date = new Date();
					date.setDate(date.getDate()+parseInt(ns[1], 10)-date.getDay());
					value = Intl.DateTimeFormat(i18n.lang(), {weekday: "long"}).format(date);
					break;
			}
			this.innerHTML = value;

		}else{
			this.innerHTML = i18n($(this).attr("trans"));
		}
	});

	$("body *", ctx).each(function(){
		var node = this;
		[].forEach.call(node.attributes, function(attr){
			var value = attr.nodeValue;
			if(/%[^%]+%/.test(value)){
				while(/%[^%]+%/.test(value)){
					var txt = value.match(/%([^%]+)%/)[1];
					if(txt.indexOf(":")!==-1){
						var ns = txt.split(":");
						switch(ns[0]){
							case "wk":
								var date = new Date();
								date.setDate(date.getDate()+parseInt(ns[1], 10)-date.getDay());
								value = Intl.DateTimeFormat(i18n.lang(), {weekday: "short"}).format(date);
								break;
							case "wkl":
								var date = new Date();
								date.setDate(date.getDate()+parseInt(ns[1], 10)-date.getDay());
								value = Intl.DateTimeFormat(i18n.lang(), {weekday: "long"}).format(date);
								break;
						}
					}else{
						value = value.replace(/%[^%]+%/, i18n(txt));
					}
				}
				$(node).attr(attr.nodeName, value);
			}
		});
	});
}

/*
if(localStorage['language']=="id"){
	shownolang.innerHTML='<b> Translation update is needed for <span title="Language code">"'+localStorage['language']+'"</span>! Update it <a href="http://spreadsheets.google.com/viewform?formkey=dEtYWXduRzh4dDFtZV9PU1JRYkpEaFE6MA" target="_blank">here</a>.</b>'
}
*/


function showcredit(){
	alert('People who have helped me translate:\n\n - DerekL (繁體中文)\n\
 - Paulo + Silvia Cataldi + Dany (Español)\n\
 - Евгений + Cyber (updates) (Russian)\n\
 - Sumurai8 + Jack (Dutch)\n\
 - Loko (Português-BR)\n\
 - WindWT (简体中文)\n\
 - john.carter + Emmanuel DOLCINE (updates) (Français)\n\
 - barko (Hebrew)\n\
 - alm10965 + Heiko Buchert (German)\n\
 - Bruno (European Portuguese pt-PT)\n\
 - Jaykob + Burbon(Czech)\n\
 - Bogdan (Romanian)\n\
 - Karol Garlicki (Polish)\n\
 - Daniele Guttuso (Italian)\n\
 - kanttii (Finnish)\n\
 - Haldun Alay (Turkish)\n\
 - xiangwei xu (Indonesian)\n\
 - Cure Blossom + KSSK (日本語)\n\
 - Kusang (한국의)\n\
 - Àngel Agustí (Catalan)\n\
 - Jon Harald Søby (Norwegian [Bokmål])\n\
 - Pedram Jabbari (Persian)\n\
 - ~koloki8as~ (Greek)\n\
 - Pokorádi Zsuzsa (Hungarian)\n\
 - khanh nguyen le + SITUVN (Vietnamese)\n\
 - maicky + Stanimir Karavelikov (Bulgarian)\n\
 - Haldun Alay (Turkish)\n\
\n\
 Thanks for the helps!')
}

function pupmonth(num){
	return i18n("month_"+(num+1))
}

function pupweekday(num){
	return i18n("day_"+num)
}

function pmam(){
	var today=new Date();
	var am
	var pm
	if(getTimezone()>=12){
		return i18n("pm")
	}else{
		return i18n("am")
	}

}

function pupgreeting(num){
	switch(num){
		case 0:
			return i18n("morning")
		case 1:
			return i18n("noon")
		case 2:
			return i18n("evening")
		case 3:
			return i18n("night")
		case 4:
			return i18n("midnight")	
	}
}


function popuppage(){
	popau.title=i18n("close");
	pav.innerHTML=i18n("settings");
	pag.innerHTML=i18n("timeis");
	pat.innerHTML=i18n("notflash");
	pbk.innerHTML=i18n("version");
	countdownbtn.title=i18n("countdown");
	commentbtn.title=i18n("comment");
	alarmbtn.title=i18n("alarm");
	info.title=i18n("stat");
	timerbtn.title=i18n("timer");
	viewsavedalarmbtn.title=i18n("viewsavedalarm");
	if(localStorage["language"]=="zh-TW"||localStorage["language"]=="zh-CN"||localStorage["language"]=="ja"){
		text_tools.style.position="absolute";
		text_tools.style.webkitTransform="rotate(-90deg) translate(5px, -7px)";
		text_tools.innerHTML=i18n('tools');
	}
}

/*
function opquit(){
	if(unsave==1){
		return i18n("notsaved");
	}
}
*/

/*
function bgnotitxt(){
	var today=new Date()
	today.applyTZ();
	if(localStorage["pm"]=="true"){
		var time=change_time_to_12(today.getHours())+":"+checkTime(today.getMinutes())+" "+pmam()+".";
		var b_time=pmam()+change_time_to_12(today.getHours())+":"+checkTime(today.getMinutes());
	}else{
		var time=today.getHours()+":"+checkTime(today.getMinutes());
		var b_time=today.getHours()+":"+checkTime(today.getMinutes());
	}
	var title="",
		lang=localStorage["language"];
	title=i18n("notitimeannounce")+"<br>"+i18n("notitimeis")+" ";
	if(lang.slice(0,2)=="zh"||lang=="ja"||lang=="ko"||lang=="ar"){
		title+=b_time;
	}else if(lang=="de"){
		title=title+time+" uhr."
	}else{
		title=title+time+".";
	}
	return title
}
*/