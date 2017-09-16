console.log("Started: " + new Date().toString());

//save load in time
localStorage["uptime"] = Date.now();

/**
 * TODO: Update legacy code and remove
 */
var Functions = {
	time: function(noApplyTZ, date){
		if(!noApplyTZ){
			if(date)	date.applyTZ();
			else    	date = new Date().applyTZ();
		}else{
			if(!date)	date = new Date();
		}

		return {
			dateObj: date,
			year: date.getFullYear(),
			month: date.getMonth(),
			date: date.getDate(),
			hour: date.getHours(),
			min: date.getMinutes(),
			sec: date.getSeconds(),
			pm: {
				enabled: localStorage["pm"] == "true",
				hour: date.getHours() - ((date.getHours() > 12)? 12 : ((date.getHours() == 0)? -12 : 0)),
				label: i18n(["am","pm"][+(date.getHours() >= 12)])
			},
			i18n: {
				dateString: function(){ return i18n.dateString(date); },
				timeString: function(){ return i18n.timeString(date); },
				dateTimeString: function(){ return i18n.dateTimeString(date); },
				customString: function(obj){ return i18n.customString(obj, date); }
			},
			getCalendar: function(calendar, date){
				var date = date || this.dateObj;
				switch(calendar){
					case "lunar":
						var y = Intl.DateTimeFormat("zh-TW-u-ca-chinese",{year:"numeric"}).format(date)/*.match(/\d+/)[0]*/,
							m = Intl.DateTimeFormat("zh-TW-u-ca-chinese",{month:"numeric"}).format(date)/*.match(/\d+/)[0]*/,
							d = Intl.DateTimeFormat("zh-TW-u-ca-chinese",{day:"numeric"}).format(date)/*.match(/\d+/)[0]*/,
							天干 = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"],
							地支 = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"],
							十 = ["初","十","廿","三"],
							月 = ["","十"],
							個 = ["一","二","三","四","五","六","七","八","九","十"];

						var isL = false;
						d = d.match(/\d+/)[0];

						//Older Chrome does not have auto-conversion
						if(/\d+/.test(y)){
							y = y.match(/\d+/)[0];
							m = m.match(/\d+/)[0];
							isL = isLeapMonth();
							y = 天干[(y-1)%10] + 地支[(y-1)%12] + "年";
							m = (月[(m-1)/10|0] + 個[(m-1)%10]).replace(/^一$/,"正") + "月";
						}
						d = (十[(d)/10|0] + 個[(d-1)%10]).replace(/^十十$/,"初十").replace(/^廿十$/,"二十");

						return y + (isL?"閏":"") + m + d;

						function isLeapMonth(){
							var _date = new Date(date);
							_date.setDate(-d);
							//console.log(+Intl.DateTimeFormat("zh-TW-u-ca-chinese",{month:"numeric"}).format(_date).match(/\d+/)[0],m);
							return +Intl.DateTimeFormat("zh-TW-u-ca-chinese",{month:"numeric"}).format(_date).match(/\d+/)[0] === m;
						}
				}
			}
		};
	},
	ls: function(key, obj){
		if(arguments.length === 1 && typeof key === "string"){
			if(localStorage[key]){
				try{
					var json = JSON.parse(localStorage[key]);
				}catch(err){
					var json = undefined;
				};
			}
			return localStorage[key] ? {json: json, raw: localStorage[key], modify: function(callback){
				var entry = JSON.parse(localStorage[key]);
				callback.call(entry);
				localStorage[key] = JSON.stringify(entry);
			}} : undefined;
		}else if(arguments.length === 2 && typeof key === "string" && (typeof obj === "object" || typeof obj === "string")){
			try{
				var str = JSON.stringify(obj);
				localStorage[key] = typeof obj === "object" ? str : obj;
				return localStorage[key];
			}catch(err){
				//this shouldn't happen
				createNoti({title: "Something wrong happened.", message: "You shouldn't see this error at all, but if you do, please submit a bug report.\n\nError message: " + err.message});
			}
		}
	},
	// playSound: function(obj, onlyAddHandles){
	//	obj = $.extend({
	//		data: "about:blank",
	//		onPlay: function(){},
	//		onEnded: function(){}
	//	}, obj);
	//	if(obj.node === undefined){
	//		var audio = $("<audio>").appendTo("body");
	//	}else{
	//		var audio = $(obj.node);
	//	}
	//	if(!onlyAddHandles){
	//		audio.attr({
	//			src: obj.data,
	//			class: "hide"
	//		});
	//	}

	//	if(obj.steps !== undefined){
	//		var steps = function(){
	//			obj.steps.call(audio[0], audio[0].currentTime, audio[0].duration);
	//		};
	//		audio.on("ended", function(){
	//			steps();
	//			clearInterval(stepInterval);
	//		})
	//	}

	//	audio.on("play", function(e){ obj.onPlay.call(this, e); } );
	//	audio.on("ended", function(e){ obj.onEnded.call(this, e); } );

	//	var stepInterval;

	//	var controls = {
	//		node: audio[0],
	//		kill: function(){ audio.remove(); if(obj.link !== undefined){ play.unbind("click"); pause.unbind("click"); stop.unbind("click"); } },
	//		play: function(){ audio[0].play(); if(obj.steps !== undefined){ stepInterval = setInterval(steps, 100); } },
	//		pause: function(){ audio[0].pause(); if(obj.steps !== undefined){ clearInterval(stepInterval); } },
	//		stop: function(){ audio[0].pause(); audio[0].currentTime = 0; audio.trigger("ended"); },
	//		currentTime: function(){ return audio[0].currentTime; },
	//		duration: function(){ return audio[0].duration; }
	//	};

	//	if(obj.link !== undefined){
	//		var play = $(obj.link.play),
	//			pause = $(obj.link.pause),
	//			stop = $(obj.link.stop);
	//		play.click(function(){
	//			controls.play();
	//			$(this).attr("disabled", true);
	//			pause.attr("disabled", false);
	//			stop.attr("disabled", false);
	//		});
	//		pause.click(function(){
	//			controls.pause();
	//			$(this).attr("disabled", true);
	//			play.attr("disabled", false);
	//		});
	//		stop.click(function(){
	//			controls.stop();
	//		});
	//		audio.on("ended", function(){
	//			play.attr("disabled", false);
	//			pause.attr("disabled", true);
	//			stop.attr("disabled", true);
	//		});
	//	}

	//	return controls;
	// },
	//Bootstrap modal
	createModal: function(options, win){
		if(!win) throw "Window must be given."
		var $ = win.$;
		options = $.extend({
			title: "",
			content: "",
			backdrop: true,
			size: "normal",
			buttons: [],
			closeBtn: true,
			closeBtnText: i18n("close"),
			onClose: function(){},
			onShow: function(){},
			onShown: function(){}
		}, options);

		var modal = $("<div>").attr({
				"class": "modal fade",
				"role": "dialog"
			}).attr("data-backdrop", options.backdrop),
			dialog = $("<div>").attr({
				"class": "modal-dialog modal-" + options.size
			}).removeClass("modal-normal").appendTo(modal),
			content = $("<div>").attr({
				"class": "modal-content"
			}).appendTo(dialog),
			header = $("<div>").attr({
				"class": "modal-header"
			}).appendTo(content),
			h4 = $("<h4>").attr({
				"class": "modal-title"
			}).html(options.title).appendTo(header),
			body = $("<div>").attr({
				"class": "modal-body"
			}).appendTo(content),
			footer = $("<div>").attr({
				"class": "modal-footer"
			}).appendTo(content);

			if(typeof(options.content) === "string"){
				body.html(options.content);
			}else{
				body.append(options.content);
			}

			if(options.closeBtn){
				$("<button>")
					.addClass("close")
					.attr({
						"data-dismiss": "modal",
						title: options.closeBtnText
					})
					.html("&times;")
					.prependTo(header);
				$("<button>")
					.addClass("btn btn-default")
					.attr("data-dismiss", "modal")
					.html(options.closeBtnText)
					.appendTo(footer);
			}
			$.each(options.buttons, function(){
				var entry = this;
				$("<button>")
					.addClass("btn btn-" + (this.style ? this.style : this.primary ? "primary" : "default"))
					.html(this.title)
					.appendTo(footer)
					.click(function(){
						entry.onclick.call(modal);
					});
			});

		modal.appendTo("body").modal().on("hidden.bs.modal", function(){
			modal.remove();
			options.onClose();
		}).on("show.bs.modal", function(){
			options.onShown();
		}).on("shown.bs.modal", function(){
			options.onShown();
		});

		return modal;
	}
};

/**
 * TODO: Update code and remove this function
 */
Number.prototype.addZero = function(){
	return (this < 10 ? "0" : "") + this;
};

/**
 * TODO: Move to its own Notification component
 */
function createNoti(opt, selfOpt){
	selfOpt = selfOpt || {};

	var id = ""+ +new Date();
	var buttons = [];
	if(selfOpt.buttons){
		var _systemButtons = [];
		for(var i = 0; i < selfOpt.buttons.length; i++){
			_systemButtons[i] = {
				title: selfOpt.buttons[i].title
			};
			if(selfOpt.buttons[i].iconUrl){
				_systemButtons[i].iconUrl = selfOpt.buttons[i].iconUrl;
			}
		}
		opt.buttons = _systemButtons;
	}
	
	var options = $.extend({
		title: " ",
		message: " ",
		type: "basic",
		iconUrl: "n_icon.png",
		isClickable: false
	}, opt);
	chrome.notifications.create(id, options, function(id){
		if(selfOpt.time){
			setTimeout(function(){
				chrome.notifications.clear(id, function(){});
			}, selfOpt.time);
		}
		if(selfOpt.buttons){
			chrome.notifications.onButtonClicked.addListener(function(target, index){
				if(target === id){
					chrome.notifications.clear(id, function(){});
					selfOpt.buttons[index].onclick();
				}
			});
		}
		if(typeof selfOpt.onclose !== "undefined"){
			chrome.notifications.onClosed.addListener(function listener(target){
				if(target === id){
					chrome.notifications.onClosed.removeListener(listener);
					selfOpt.onclose();
				}
			});
		}
		if(typeof selfOpt.onclick !== "undefined"){
			chrome.notifications.onClicked.addListener(function listener(target){
				if(target === id){
					chrome.notifications.onClicked.removeListener(listener);
					selfOpt.onclick();
				}
			});
		}
	});

	return {
		id: id,
		show: function(){},
		cancel: function(){
			chrome.notifications.clear(id, function(){});
		},
		update: function(opt){
			chrome.notifications.update(id, $.extend(options, opt), function(){});
		}
	};
}

function formatDate(date, seperator){
	if(date instanceof Date){
		var obj = {
				Year: date.applyTZ().getFullYear(),
				Month: date.applyTZ().getMonth()+1,
				Date: date.applyTZ().getDate()
			};
	}else if(typeof date == "string"){
		var date = date.split("-"),
			obj = {
				Year: date[0],
				Month: date[1],
				Date: date[2]
			};
	}else{
		throw "Only accepts Date or String objects.";
	}
	var refre = JSON.parse(localStorage["dateorder"]),
		seperator = seperator || "-";
	
	return [ obj[refre["1"]], obj[refre["2"]], obj[refre["3"]] ].join(seperator);
}

/**
 * Build context menu items
 * TODO: Move to its own component
 */
function createContextMenu(list, callback, pID){
	if(typeof list !== "object"){
		throw "createContextMenu requires an array input.";
	}
	for(var i = 0; i < list.length; i++){
		var item = list[i],
			title = item.title,
			type = item.type || "normal",
			checked = item.checked,
			contexts = item.contexts || ["page", "link", "image", "video", "audio"],
			onclick = item.onclick || function(){},
			parentId = item.parentId || pID,
			enabled = (typeof item.enabled == "undefined")? true : item.enabled;
			
		var obj = {
			type: type,
			title: title,
			checked: checked,
			contexts: contexts,
			onclick: onclick,
			enabled: enabled
		}
		
		if(typeof parentId !== "undefined"){
			obj.parentId = parentId;
		}
		
		//console.log(obj);
		var menuItem = chrome.contextMenus.create(obj);
		
		if(callback){
			callback(menuItem);
		}
		
		if(item.children){
			createContextMenu(item.children, callback, menuItem);
		}
	}
}

/**
 * Preload fonts to be used in canvas.
 * @param  {Array} fonts Array of fonts
 */
function fontLoader(fonts){
	var c = document.createElement("canvas"), ctx = c.getContext("2d");
	$.each(fonts, function(){
		ctx.font = "1px " + this;
		ctx.fillText("a", 0, 0);
	});
}

// Create contextmenu items
// TODO: Move this to its own component
function createMenuItem(){
	if(localStorage["context_menu_item_enable"] == "false"){
		return false;
	}
	
	chrome.contextMenus.removeAll();
	
	var list = [{
		title: i18n("setalarm"),
		onclick: function(){
			Components.getSingleton("AlarmClock").displayUI(true);
		}
	}, {
		title: i18n("viewsavedalarm"),
		onclick: function(){
			Components.getSingleton("AlarmClock").displayUI(false);
		}
	}, {
		title: i18n("countdown"),
		onclick: function(){
			Components.getSingleton("CountdownTimer").displayUI();
		}
	}, {
		title: i18n("timer"),
		onclick: function(){
			Components.getSingleton("Stopwatch").displayUI();
		}
	}, {
		title: i18n("calendar"),
		onclick: function(){
			chrome.tabs.create({url: 'calendar_full.html'});
		}
	}, {
		type: "separator"
	}, {
		title: "Voice Control...",
		onclick: function(){
			window.open('speech.html','_blank','width=640,height=960,left=10,top=10');
		}
	}, {
		type: "separator"
	}, {
		type: "radio",
		checked: localStorage["use_digit"] == "true",
		title: i18n("digital"),
		contexts: ["browser_action", "page", "link", "image", "video", "audio"],
		onclick:function(){
			localStorage["use_digit"] = true;
			//show_time();
			//icon();
			Components.getSingleton("BrowserActionHandler").updateIcon();
		}
	}, {
		type: "radio",
		checked: localStorage["use_digit"] == "false",
		title: i18n("analog"),
		contexts: ["browser_action", "page", "link", "image", "video", "audio"],
		onclick:function(){
			localStorage["use_digit"] = false;
			//point_clock();
			//icon();
			Components.getSingleton("BrowserActionHandler").updateIcon();
		}
	}, {
		type: "separator"
	}, {
		title: i18n("settings") + "...",
		onclick: function(){
			//chrome.tabs.create({url: "options_new.html"});
			chrome.runtime.openOptionsPage();
		}
	}, {
		type: "separator"
	}, {
		title: i18n("ctxcmt"),
		onclick: function(){
			chrome.tabs.create({url: "https://chrome.google.com/webstore/support/icegcmhgphfkgglbljbkdegiaaihifce#bug"});
		}
	}, {
		title: i18n("ctxhide"),
		onclick: function(){
			if(confirm("Are you sure?\n\nYou can turn it back on in the options page.")){
				localStorage["context_menu_item_enable"] = "false";
				chrome.contextMenus.removeAll();
			}
		}
	}, {
		title: i18n("help"),		
		onclick: function(){
			chrome.tabs.create({url: "https://docs.google.com/document/d/1BhBnW1-mzGExFMwz7RtccqRGV6tvnzA1D7ZnyTqf5A8/pub"});
		}
	}, {
		title: i18n("about"),
		contexts: ["browser_action", "page", "link", "image", "video", "audio"],
		children: [{
			title: i18n("forum"),
			onclick: function(){
				chrome.tabs.create({url: "https://groups.google.com/forum/#!forum/chrome-clock"});
			}
		}, {
			title: "Facebook Page",
			onclick: function(){
				chrome.tabs.create({url: "https://www.facebook.com/coolclock"});
			}
		}, {
			title: i18n("whatsnew"),
			contexts: ["browser_action", "page", "link", "image", "video", "audio"],
			onclick: function(){
				chrome.tabs.create({url: "/update.html"});
			}
		}, {
			title: i18n("about")+((i18n.lang()!="ja")?(" "+i18n("extName")):("")),
			contexts: ["browser_action", "page", "link", "image", "video", "audio"],
			onclick: function(){
				Components.getSingleton("WindowManager").displayAbout();
			}
		}]
	}, 
	
	//misc
	{
		title: "Get current time...",
		contexts: ["editable"],
		onclick: function(info, tab){
			Components.depends(function(TimeTZ, ClipboardWriter){
				var currentTime = new TimeTZ(),
					timeString = currentTime.dateTimeString();

				function writeToClipboard(text){
					ClipboardWriter.write(text, function(){
						createNoti({
							title: "Time and date copied to clipboard.", 
							message: "You can now paste it on a text field.",
						}, {
							time: 5000
						});
					});
				}

		 		// load listener
		 		chrome.tabs.executeScript(tab.id, {
		 			file: "scripts/ContextMenuDateWriter.js"
		 		}, function(){
		 			// tell content script to write date
		 			chrome.tabs.sendMessage(tab.id, {text: timeString, emulated: +currentTime}, function(success){
		 				// not an input tag, copy to clipboard instead
		 				if(!success)	writeToClipboard(timeString);
		 			});
		 		});
		 	});
		}		
	}];
	
	createContextMenu(list);
}

// Desktop Notification(To-do)
// TODO: Move this to its own component
function showTodo(){
	var d = new Date(),
		year = d.getFullYear(),
		month = d.getMonth(),
		date = d.getDate(),
		list = JSON.parse(localStorage["todo"]),
		day = list["" + year + (month+1).addZero() + date.addZero()];
	
	if(!day){
		return false;
	}
		
	var title = "Today's events",
		content = [],
		list = [];
	
	for( var i = 0; i < day.length; i++ ){
		var entry = day[i];
		content.push("<li>➭ " + entry.text + "</li>");
		list.push({
			title: "Todo ",
			message: entry.text
		});
	}
	
	if(Features.notificationCenterAvailable){
		createNoti({
			title: title,
			message: "Today's todo:",
			type: "list",
			items: list
		}, {
			buttons: [{
				title: "View in calendar",
				iconUrl: "/images/icons/calendar_view_day.png",
				onclick: function(){
					chrome.tabs.create({
						url: "/calendar_full.html"
					});
				}
			}],
			time: 7000
		});
	}else{
		var notification = createNoti({
				title: title,
				message: content.join("")
			});
		notification.show();
		if(localStorage["manuallyclosenoti"] != "true"){
			setTimeout(function(){
				notification.cancel();
			},7000);
		}
	}
	
}


// Init extension state
function init(log, TimeTZ){
	// preload fonts
	fontLoader(["Roboto", "Roboto-Thin", "meteocons"]);

	// TODO: Init these in their own component
	createMenuItem();
	showTodo();

	log("init", "Init completed.");
}


// Compatibility check
runCompatibilityCheck.init();

console.groupCollapsed("Components Initialization");
Components.import("/components/", "app", function(result){
	console.groupEnd();
	
	if(result.status === "ok"){
		Components.depends(init);

		// debug
		Components.getRegisteredComponents().forEach(function(componentName){
			window[componentName] = Components.getSingleton(componentName);
		});
	}else{
		console.error("Components init failed. Reasons:", result.reasons.join("; "));
	}
});