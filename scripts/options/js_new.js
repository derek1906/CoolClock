var Components = chrome.extension.getBackgroundPage().Components;

$(function(){

	document.title = i18n("settings");
	i18n.translate();

	//jQuery UI sortable
	$("#dateorder").sortable({
		items: "li:not(.list-heading)",
		axis: "y"
	});

	//Glyphicons
	$("gly").each(function(){
		$("<span>").addClass("glyphicon glyphicon-" + $(this).attr("icon") + " " +  $(this).attr("class")).insertAfter(this);
		$(this).remove();
	});

	//File inputs
	$("input[type=file]").each(function(){
		var target = this;
		$("<button>").addClass("btn btn-default btn-sm").html(gly("folder-open") + " Choose a file...").insertAfter(this).click(function(e){
			$(target).click();
			e.preventDefault();
		});
		$(this).addClass("hide");
	});

	//Voice engines
	chrome.tts.getVoices(function(list){
		var obj = JSON.parse(localStorage["voice"]);
		for(var i = 0; i < list.length; i++){
			var entry = $("<a>")
				.attr({href: "#"})
				.html(list[i].voiceName)
				.appendTo($("<li>").appendTo("#vc_engine ~ ul"));
			if(list[i].voiceName == obj.voiceName){
				entry.attr("selected", true);
			}
		}
	//});
	//everything after is inside it
	
	//Tooltip
	$("*[data-toggle=tooltip]").tooltip();

	//Current Timezone
	$("#current_timezone").text(getCurrenttimezone());

	//dropdown
	dropdown();

	registerEvents([
		{     //navbar
			ele: $("#list > a[href]"),
			action: function(){
				$('html, body').stop().animate({
					scrollTop: $("#" + this.href.match(/#(.+)/)[1]).offset().top - 77 - 8
				}, 200);
			}
		}, {
			ele: $(window),
			type: "hashchange",
			action: function(){
				var ele = $("#" + location.hash.match(/#(.+)/)[1]);
				if(ele.length){
					$('html, body').stop().animate({
			scrollTop: ele.offset().top - 77 - 8
		}, 0);
				}
			}
		}, {  //navbar indicator
			ele: $(window),
			type: "scroll",
			init: true,
			action: menuSpy
		}, {  //adjust spacer
			ele: $(window),
			type: "resize",
			init: true,
			action: function(){
				$("#spacer").css("height", this.innerHeight - $(".panel").last().height() - 77 - 8 - 16 - 7);
			}
		}, {  //test notification btn
			id: "testnotibtn",
			action: function(){
				//chrome.extension.getBackgroundPage().Functions.createHourlyNoti();
				Components.getSingleton("HourlyTimeAnnouncementHandler").displayNotification();
			}
		}, {  //search weather location btn
			id: "weather_search",
			action: function(){
				var ctn = $("<div>");
					topbar = $("<div>").addClass("input-group").appendTo(ctn),
					caption = $("<span>").addClass("input-group-addon").html("Location, postal code, or POI").appendTo(topbar);
					search = $("<input>").addClass("form-control").appendTo(topbar),
					searchBtn = $("<button>").addClass("btn btn-default").appendTo($("<span>").addClass("input-group-btn").appendTo(topbar));
					icon = $("<span>").addClass("glyphicon glyphicon-search").appendTo(searchBtn),
					resultArea = $("<div>").addClass("list-group").appendTo(ctn);

				function yqlSearch(){
					resultArea.empty().html("<div class='text-center'>Loading...</div>");
					$.ajax({
						type: "GET",
						url: "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20geo.places%20where%20text%3D%22" + encodeURIComponent(search.val()) + "%22&format=json",
						dataType: "json",
						success: function(result) {
							resultArea.empty();
							if(result.query.count == 0){
								$("<a>").addClass("list-group-item").html("No result").appendTo(resultArea);
							}else if($.type(result.query.results.place) == "array"){
								var list = result.query.results.place;
								for(var i = 0; i < list.length ; i++){
									var name = list[i].name,
										type = " (" + list[i].placeTypeName.content + ")",
										admin1 = "",
										admin2 = "",
										country = list[i].country.content,
										woeid = list[i].woeid;
									if(list[i].admin1 != null){
										admin1 = ", " + list[i].admin1.content;
									}
									if(list[i].admin2 != null){
										admin2 = ", " + list[i].admin2.content;
									}
									
									$("<a>").attr("href", "#").addClass("list-group-item").html(name + type + admin2 + admin1 + ", " + country).data("woeid", woeid).data("name", name).appendTo(resultArea);
								}
							}else{
								var list = result.query.results.place,
									name = list.name,
									type = " (" + list.placeTypeName.content + ")",
									admin1 = "",
									admin2 = "",
									country = list.country.content,
									woeid = list.woeid;
								if(list.admin1 != null){
									admin1 = ", " + list.admin1.content;
								}
								if(list.admin2 != null){
									admin2 = ", " + list.admin2.content;
								}
								
								$("<a>").attr("href", "#").addClass("list-group-item").html(name + type + admin2 + admin1 + ", " + country).data("woeid", woeid).data("name", name).appendTo(resultArea);
							}
							$("a", resultArea).click(function(e){
								var ele = $(this);
								$("#weather_woeid").val(ele.data("woeid")).trigger("change");
								$("#weather_name").text(ele.data("name"));
								chrome.extension.getBackgroundPage().Functions.ls("weather").modify(function(){
									this.name = ele.data("name");
								});
								modal.modal("hide");
								e.preventDefault();
								return false;
							})
						},
						error: function(err){
							resultArea.empty();
							console.log("Error fetching data.", err);
							$("<a>").addClass("list-group-item").html("An error occured when fetching data. (Status: " + err.status + ")").appendTo(resultArea);
						}
					});
				}

				searchBtn.click(yqlSearch);
				search.keyup(function(e){
					(e.keyCode === 13) && yqlSearch();
				})

				var modal = createModal({
					title: gly("search") + " Search By Name",
					content: ctn,
					closeBtnText: i18n("cancel")
				});
			}
		},


		//file inputs
		{
			id: "noti_ringtone",
			type: "change",
			action: function(){
				readFile({files: this.files, target: this, callback: function(result){
					localStorage["noti_sound"] = result;
					var modal = createModal({
				    	title: gly("ok-circle") + " Imported!",
						content: "You can press the \"Test Notification\" button to test it."
					});
				}});
			}
		}, {
			id: "ringtone",
			type: "change",
			action: function(){
				readFile({files: this.files, target: this, callback: function(result){
					var isDB = false;
					if(result.length > (2286976 + 22)){
						if(confirm("The file is too big to save in local storage.\nDo you want to save it in the Web SQL Database?\n(Database has more space than local storage.)\n\nReminder: Using files that're very big is not recommended. Files too big might take a few seconds to load.")){
							setTimeout(function(){
								var db = window.openDatabase('DB', '1.0', 'Settings database', 5 * 1024 * 1024);
					    		db.transaction(function (tx) {
					    			tx.executeSql('CREATE TABLE IF NOT EXISTS data (key,data,timestamp)');
					    			tx.executeSql('DELETE FROM data WHERE key="ringtone"');
					    			tx.executeSql('INSERT INTO data VALUES ("ringtone","'+result+'",'+Number(new Date())+')',[],function(tx,results){console.log("Successfully stored file in Database!")});
					    		});
					        },10);
					    	localStorage["ringtone"] = "database";
							isDB = true;
						}else{
							if(confirm("The file is too large for local storage. ("+result.length+" bytes long)\nDo you want to cut it into a smaller sound clip?")){
								result = result.slice(0, (2286976+22));
							}
						}
					}
					if(!isDB){
				    	localStorage["ringtone"] = result;
				    }
				    var modal = createModal({
				    	title: gly("ok-circle") + " Success!",
						content: "Imported!"
					});
				}});
			}
		},

		//ringtone player load btn
		{
			id: "ringtone_load",
			action: function(){
				if(window.player) player.kill();
				var data = "",
					originialMsg = gly("floppy-open") + " Load",
					btn = $(this);
				btn.html("Loading...");
				function init(){
					window.player = playSound({
						data: data,
						steps: function(a,b){
							$("#ringtone_duration").css({
								width: a / b * 100 + "%"
							});
						},
						link: {
							play: "#ringtone_play",
							pause: "#ringtone_pause",
							stop: "#ringtone_stop"
						},
						onPlay: function(){
							$("#ringtone_duration").parent().addClass("progress-striped active");
							$("#ringtone_load").attr("disabled", true);
						},
						onEnded: function(){
							$("#ringtone_duration").parent().removeClass("progress-striped active");
							$("#ringtone_load").attr("disabled", false);
						}
					});
					$("#ringtone_play").attr("disabled", false);
					btn.html("Loaded.");
					setTimeout(function(){ btn.html(originialMsg); }, 3000);
				}
				if(localStorage["ringtone"] == "none"){
					createModal({
						title: gly("exclamation-sign") + " Bump!",
						content: "I am having a hard time trying to load the ringtone because you haven't set one..."
					});
					$("#ringtone_play").attr("disabled", true);
					$(this).html(originialMsg);
				}else if(localStorage["ringtone"] == "default" || localStorage["ringtone"] == null){
					data = "sounds/alarm.mp3";
					init();
				}else if(localStorage["ringtone"]=="database"){
					setTimeout(function(){
						var db = openDatabase('DB', '1.0', 'my database', 2 * 1024 * 1024);
							db.transaction(function (tx) {
								tx.executeSql('SELECT * FROM data WHERE key="ringtone"',[],function(tx,r){
								data = r.rows.item(0).data
								init();
					    	});
					    });
					},10);
				}else{
					data = localStorage["ringtone"];
					init();
				}
			}
		},

		//language switcher
		{
			id: "language",
			type: "change",
			action: function(){
				//localStorage['language'] = this.value;
				//document.title = i18n("settings");
				//i18n.translate();
				//chrome.contextMenus.removeAll();
				//chrome.extension.getBackgroundPage().createMenuItem();
				Components.getSingleton("Localization").setSelectedLanguage(this.value);
				location.reload();
			}
		},

		//ringtone URL
		{
			id: "ring_url_input",
			type: "blur",
			action: function(){
				var input = this;
				if(!/^http(s)\:/.test(input.value)){
					createModal({
						title: gly("exclamation-sign") + " Bump!",
						content: "This is not a valid or a supported URL.",
						closeBtn: false,
						backdrop: "static",
						buttons: [{
							title: i18n("close"),
							onclick: function(){
								input.value = "";
								this.modal("hide");
							}
						},{
							title:  "Retry",
							primary: true,
							onclick: function(){
								this.modal("hide");
								input.focus();
							}
						}]
					})
				}else{
					localStorage["ringtone"] = input.value;
				}
			}
		},

		//date order
		{
			id: "dateorder",
			type: "sortstop",
			noPreventDefault: true,
			action: function(){
				var obj = {
					"1": $("#dateorder > li:eq(1)").attr("data-value"),
					"2": $("#dateorder > li:eq(2)").attr("data-value"),
					"3": $("#dateorder > li:eq(3)").attr("data-value")
				}
				localStorage["dateorder"] = JSON.stringify(obj);
			}
		},

		//language credits
		{
			id: "lang_credits",
			action: showcredit
		},

		//edit analog
		{
			id: "editAnalog",
			action: function(){
				var def = chrome.extension.getBackgroundPage().Functions.ls("clockDefinition").json;
				var content = $("<div>"),
					heading = $("<p>").html("<b>Advanced</b>").appendTo(content),
					desc = $("<p>").html("This is intended for advanced users. You can fine tune each part by editing the configuration file below.<br><br>Note: Width and height correspond to the icon size. By default they should be 19x19dp.").appendTo(content),
					textarea = $("<textarea>").html(
						JSON.stringify(def.analog, " ", 4)
					).addClass("form-control").attr({
						rows: 15,
						spellcheck: "false"
					}).appendTo(content);
				var modal = createModal({
					title: "Edit Analog Clock Appearance",
					content: content,
					buttons: [{
						title: i18n("OK"),
						primary: true,
						onclick: function(){
							try{
								var obj = JSON.parse(textarea.val());
							}catch(err){
								chrome.extension.getBackgroundPage().createNoti({
									title: "Invalid JSON",
									message: "Please enter valid JSON."
								}, {time: 5000});
								return false;
							}
							def.analog = obj;
							localStorage["clockDefinition"] = JSON.stringify(def);
							//chrome.extension.getBackgroundPage().icon();
							Components.getSingleton("BrowserActionHandler").updateIcon();
							modal.modal("hide");
						}
					}],
					onShown: function(){
						textarea.focus();
					}
				});
			}
		},

		//edit digital
		{
			id: "editDigital",
			action: function(){
				var def = chrome.extension.getBackgroundPage().Functions.ls("clockDefinition").json;
				var content = $("<div>"),
					heading = $("<p>").html("<b>Advanced</b>").appendTo(content),
					desc = $("<p>").html("This is intended for advanced users. You can fine tune each part by editing the configuration file below.<br><br>Note: Width and height correspond to the icon size. By default they should be 19x19dp.").appendTo(content),
					textarea = $("<textarea>").html(
						JSON.stringify(def.digital, " ", 4).replace(/\[\n\s*([^\[\n]+)\n\s*([^\[\n]+)\n\s*\]/g,"[$1 $2]")
					).addClass("form-control").attr({
						rows: 15,
						spellcheck: "false"
					}).appendTo(content);
				var modal = createModal({
					title: "Edit Digital Clock Appearance",
					content: content,
					buttons: [{
						title: i18n("OK"),
						primary: true,
						onclick: function(){
							try{
								var obj = JSON.parse(textarea.val());
							}catch(err){
								chrome.extension.getBackgroundPage().createNoti({
									title: "Invalid JSON",
									message: "Please enter valid JSON."
								}, {time: 5000});
								return false;
							}
							def.digital = obj;
							localStorage["clockDefinition"] = JSON.stringify(def);
							//chrome.extension.getBackgroundPage().icon();
							Components.getSingleton("BrowserActionHandler").updateIcon();
							modal.modal("hide");
						}
					}],
					onShown: function(){
						textarea.focus();
					}
				});
			}
		},
		//about button
		{
			id: "openAboutPage",
			type: "click",
			action: function(){
				chrome.tabs.create({
					url: "/about.html"
				});
			}
		}
	]);


	//link options
	linkOptions([{
		id: "dark_mode", type: "boolean", key: "use_dark_mode",
		onChange: function(){
			//chrome.extension.getBackgroundPage().icon();
			Components.getSingleton("BrowserActionHandler").updateIcon();
		}
	},{
		id: "font_color", type: "string", key: "clockcolor_value",
		onChange: function(){
			$(this).css("background", this.value);
			//chrome.extension.getBackgroundPage().icon();
			Components.getSingleton("BrowserActionHandler").updateIcon();
		},
		changeAtInit: true
	},{
		id: "noscroll", type: "boolean", key: "show", onChange: function(){
			//chrome.extension.getBackgroundPage().icon(false);
			Components.getSingleton("BrowserActionHandler").updateIcon();
		}
	},{
		id: "displayIcon", type: "boolean", key: "icon", onChange: function(){
			//chrome.extension.getBackgroundPage().icon();
			Components.getSingleton("BrowserActionHandler").updateIcon();
		}
	},{
		id: "timeOnBadge", type: "boolean", key: "badge", onChange: function(){
			//chrome.extension.getBackgroundPage().icon(false);
			Components.getSingleton("BrowserActionHandler").updateIcon();
		}
	},{
		id: "badge_color", type: "string", key: "badge_color",
		onChange: function(){
			$(this).css("background", this.value);
			//chrome.extension.getBackgroundPage().icon();
			Components.getSingleton("BrowserActionHandler").updateIcon();
		},
		changeAtInit: true
	},{
		id: "popup_design", type: "custom", key: "popup_version",
		LStoValue: [
			["1", true],
			["0", false]
		],
		onChange: function(){
			Components.getSingleton("BrowserActionHandler").updatePopup();
		}
	},{
		id: "lunar", type: "boolean", key: "lunar"
	},{
		id: "pm", type: "boolean", key: "pm", onChange: function(){
			//chrome.extension.getBackgroundPage().icon();
			Components.getSingleton("BrowserActionHandler").updateIcon();
		}
	},{
		id: "enable_timezone", type: "boolean", key: "enabletimezone", onChange: function(){
			//chrome.extension.getBackgroundPage().icon();
			Components.getSingleton("BrowserActionHandler").updateIcon();
		}
	},{
		id: "timezone", type: "select", key: "timezone", onChange: function(){
			//chrome.extension.getBackgroundPage().icon();
			Components.getSingleton("BrowserActionHandler").updateIcon();
		}
	},{
		id: "show_noti", type: "boolean", key: "shownotification"
	},{
		id: "noti_bgColor", type: "string", key: "noti_bgColor",
		onChange: function(){
			$(this).css("background", this.value);
		},
		changeAtInit: true
	},{
		id: "show_noti_time", type: "number", key: "shownotificationtime"
	},{
	//	id: "weather" , type: "custom", key: "weather", json: "enabled",
	//	LStoValue: [
	//		["checked", true],
	//		[undefined, false]
	//	]
	// },{
		id: "weather_woeid", type: "string", key: "weather", json: "woeid"
	},{
		id: "weather_name", type: "static", key: "weather", json: "name"
	},{
		id: "notisound", type: "custom", key: "noti_sound",
		LStoValueRegex: [
			[/^none$/, false],
			[/^data:audio.+$/, true]
		],
		regexAction: function(){},
		onClick: function(){
			if(this.checked){
				$("#noti_ringtone").click();
			}else{
				localStorage["noti_sound"] = "none";
			}
		}
	},{
		id: "noti_voice", type: "boolean", key: "noti_voice", json: "enabled"
	},{
		id: "noti_voice_text", type: "string", key: "noti_voice", json: "text"
	},{
		id: "noti_todo", type: "boolean", key: "shownotificationtodo"
	},{
		id: "ring_loop", type: "boolean", key: "ring_loop"
	},{
		id: "vc_engine", type: "select", key: "voice", json: "voiceName"
	},{
		id: "language", type: "select", key: "language"
	},{
		id: "icon_update_interval", type: "select", key: "timeupdateicon"
	},{
		id: "keepawake", type: "boolean", key: "keepawake"
	},{
		id: "show_update", type: "boolean", key: "showupdate"
	},{
		id: "bg_run", type: "boolean", key: "bg_run",
		onChange: function(){
			if(this.checked) {
			      	chrome.permissions.request({
			      		permissions: ['background']
			      	}, function(granted) {
			      		if (granted) {
			      			console.log("Success creating permission.");
			      		} else {
			      			localStorage["bg_run"] = "false";
			      		}
			      	});
			}else{			
			      	chrome.permissions.remove({
			      		permissions: ['background']
			      	}, function(removed){
			      		if(removed){
			      			// The permissions have been removed.
			      			console.log("Success removing permission.");
			      		}else{
			      			// The permissions have not been removed (e.g., you tried to remove
			      			// required permissions).
			      			alert("Oh no! Permission can not be removed because of unknown reason.");
			      			this.checked = true;
			      			localStorage["bg_run"] = "true";
			      		}
			      	});
			}
		}
	},{
		id: "show_ctx_menu", type: "boolean", key: "context_menu_item_enable",
		onChange: function(){
			if(this.checked){
				chrome.extension.getBackgroundPage().createMenuItem();
			}else{
				chrome.contextMenus.removeAll();
			}
		}
	},

	{
		name: "clockmode", type: "radio",
		onLoad: function(){
			var value = localStorage["use_digit"] === "true";
			switch(this.id){
				case "digital":
					this.checked = value;
					break;
				case "analog":
					this.checked = !value;
					break;
			}
		},
		onClick: function(){
			if(this.checked) localStorage["use_digit"] = (this.id === "digital").toString();
			Components.getSingleton("BrowserActionHandler").updateIcon();
			chrome.contextMenus.removeAll();
			chrome.extension.getBackgroundPage().createMenuItem();
		}
	},{
		name: "noti_style", type: "radio",
		onLoad: function(){
			var value = localStorage["noti_style"];
			this.checked = this.id === "noti_style_" + value;
		},
		onChange: function(){
			if(this.checked) localStorage["noti_style"] = this.id.replace(/noti_style_/, "");
		}
	},{
		name: "noti_display", type: "radio",
		onLoad: function(){
			var value = localStorage["manuallyclosenoti"] === "true";
			switch(this.id){
				case "noti_close_manual":
					this.checked = value;
					break;
				case "noti_display_time":
					this.checked = !value;
					break;
			}
		},
		onChange: function(){
			if(this.checked) localStorage["manuallyclosenoti"] = (this.id === "noti_close_manual").toString();
		}
	},{
		name: "ringtone", type: "radio",
		onLoad: function(){
			var value = "ring_", ls = localStorage["ringtone"];
			switch(ls){
				case "none":
					value += "none";
					break;
				case "default":
					value += "default";
					break;
				case "database":
					value += "comp";
					break;
				default:
					if(/^data:audio/.test(ls)){
						value += "comp";
					}else{
						value += "url";
						$("#ring_url_input").val(ls);
					}
			}
			$("#" + value)[0].checked = true;
		},
		onClick: function(){
			if(this.id === "ring_comp" && this.checked){
				$("#ringtone").click();
			}
		},
		onChange: function(){
			if(this.checked){
				switch(this.id){
					case "ring_none":
						localStorage["ringtone"] = "none";
						break;
					case "ring_default":
						localStorage["ringtone"] = "default";
						break;
				}
			}
		}
	}]);

	//restore data order
	(function(){
		var obj = JSON.parse(localStorage["dateorder"]);
		$.each(["1", "2", "3"], function(){
			var entry = obj[this];
			$("#dateorder > li:eq(" + this + ")").attr("data-value", entry).append(" " + entry);
		});
	})();

	//restore weather option
	(function(){
		var obj = JSON.parse(localStorage["weather"]);
		if(obj.enabled){
			$("#weather").prop("checked", true);
		}
		$("#weather").click(function(){
			var ele = this, obj = JSON.parse(localStorage["weather"]);
			if(this.checked) {
				/*
				chrome.permissions.request({
					origins: ['*://query.yahooapis.com/*', '*://weather.yahooapis.com/*', '*://l.yimg.com/']
				}, function(granted) {
					if (granted) {
						console.log("Success creating permission.");
						obj.enabled = "checked";
						localStorage["weather"] = JSON.stringify(obj);
					} else {
						ele.checked = false;
					}
				});
				*/
				obj.enabled = true;
				localStorage["weather"] = JSON.stringify(obj);
			}else{
				/*
				chrome.permissions.remove({
					origins: ['*://query.yahooapis.com/*', '*://weather.yahooapis.com/*', '*://l.yimg.com/']
				}, function(removed){
					if(removed){
						// The permissions have been removed.
						console.log("Success removing permission.");
						delete obj.enabled;
						localStorage["weather"] = JSON.stringify(obj);
					}else{
						// The permissions have not been removed (e.g., you tried to remove
						// required permissions).
						alert("An error just happened when removing permission.");
						ele.checked = true;
					}
				});
				*/
				obj.enabled = false;
				localStorage["weather"] = JSON.stringify(obj);
			}
		});
	})();


	//data-requires
	requires();

	//hash
	if(location.hash != ""){
		setTimeout(function(){
			$("a[href=" + location.hash + "]").click();
		}, 10);
	}

	//write version
	$("#ccversion").text(chrome.runtime.getManifest().version);

	//G+ Share
	window.___gcfg = {lang: localStorage["language"]};
	(function() {
		var po = document.createElement('script'); po.type = 'text/javascript'; po.async = true;
		po.src = 'https://apis.google.com/js/platform.js';
		var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(po, s);
	})();
	$("head").bind('DOMSubtreeModified', function(e) {
		var ele = $("style:contains('//ssl.gstatic.com')");
		if(ele.length && !ele.data("gplusModified") === true) {
			ele.data("gplusModified", true).each(function(){
				$(this).html(
					$(this).html().replace(/\/\/ssl\.gstatic\.com/ig, "http://ssl.gstatic.com")
				);
			});
		}
	});

	//FB Share
	(function(d, s, id) {
		var js, fjs = d.getElementsByTagName(s)[0];
		if (d.getElementById(id)) return;
		js = d.createElement(s); js.id = id;
		js.src = "https://connect.facebook.net/" + localStorage["language"].replace(/-/, "_") + "/all.js#xfbml=1&appId=199028093495812";
		fjs.parentNode.insertBefore(js, fjs);
	}(document, 'script', 'facebook-jssdk'));
	$('#sidebar_share').bind('DOMSubtreeModified', function(e) {
		if($("iframe[src^='chrome']").length) {
			$("iframe[src^='chrome']").attr("src", $("iframe[src^='chrome']").attr("src").replace("chrome-extension", "https"));
		}
	});

	//Twitter
	$("#twitter_btn").attr("data-lang", localStorage["language"]);
	(function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0],p=/^http:/.test(d.location)?'http':'https';if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src=p+'://platform.twitter.com/widgets.js';fjs.parentNode.insertBefore(js,fjs);}})(document, 'script', 'twitter-wjs');

	//Facts
	var facts = [
		"This extension does not contain any intentional user tracking code.",
		"Here at Cool Clock HQ, we treat grammar very seriously to avoid users sending bug reports critizing improper grammar.",
		"Cool Clock has its name as it is because its creator couldn't think of any better name.",
		"The answer to everything is not 42.",
		"This statement is false.",
		"SSBsaWtlIGhvdyB5b3Ugbm90aWNlZCB0aGlzIGlzIGluIEJhc2U2NC4="
	];
	$("#facts").text("Fact #" + (Math.random()*100|0 + 50) + ": " + facts[Math.random()*facts.length|0]);

	//speech end
	});

});

function requires(){
	$("*[data-requires]").each(function(){
		var targetID = $(this).data("requires"),
			targetEle = $("#" + targetID),
			affectedEle = this;


		if(targetEle[0].nodeName === "INPUT" && targetEle[0].type === "radio"){
			targetEle = targetEle.parents("form").find("input[type=radio][name=" + targetEle[0].name + "]");
		}

		targetEle.change(function(){
			var state = $("#" + targetID).prop("checked");

			switch(affectedEle.nodeName){
				case "DIV":
				case "LI":
				case "SPAN":
					$("input, button", affectedEle).prop("disabled", !state);
					state && $("*[data-requires]", affectedEle).each(function(){
						$("#" + $(this).data("requires")).trigger("change");
					});
					break;
				case "INPUT":
				case "BUTTON":
					$(affectedEle).prop("disabled", !state);
					break;
				default:
					console.warn("Element not supported.");
			}
			$("*[data-disabled=true]").attr("disabled", true);
		}).trigger("change");
	});
}

function createModal(options){
	options = $.extend({
		title: "",
		content: "",
		backdrop: true,
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
			"class": "modal-dialog"
		}).appendTo(modal),
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
				.addClass("btn btn-default")
				.attr("data-dismiss", "modal")
				.html(options.closeBtnText)
				.appendTo(footer);
		}
		$.each(options.buttons, function(){
			var entry = this;
			$("<button>")
				.addClass("btn btn-" + (this.primary ? "primary" : "default"))
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
	});;

	return modal;
}

createModal = function(options){
	return chrome.extension.getBackgroundPage().Functions.createModal(options, window);
};

function registerEvents(options){
	options = options || [];
	$.each(options, function(){
		var listener = $.extend({
			type: "click",
			action: function(){},
			init: false
		}, this),
			target = (listener.ele === undefined ? $("#" + listener.id) : listener.ele).on(listener.type, function(e){
				listener.action.call(this, e);
				if(!listener.noPreventDefault){
					e.preventDefault();
					return false;
				}
			});
		if(listener.init) target.trigger(listener.type);
	})
}

function linkOptions(list){
	// [{
	// 	id: "#ele",
	// 	key: "localStorageKey",
	//  type: String: [boolean, number, string, select]
	// 	json: "key in JSON", -optional
	//  LStoValue / LStoValueRegex: [[LS, Value], [LS, Value], ...]
	//  regexAction: function(){} -required if LStoValueRegex is defined
	// 	invert: boolean, -optional
	//	onChange: function(){} -optional
	// }]
	$.each(list, function(){
		var obj = $.extend({ onChange: function(){} }, this),
			value = localStorage[obj.key],
			target = $("#" + obj.id),
			targetType = obj.type;

		//determine data type
		if(obj.json !== undefined){
			value = JSON.parse(value)[obj.json];
			if(targetType === "custom"){
				if(obj.LStoValueRegex !== undefined){
					for(var i = 0; i < obj.LStoValueRegex.length; i++){
						if(obj.LStoValueRegex[i][0].test(value)){
							value = obj.LStoValueRegex[i][1];
							break;
						}
					}
				}else{
					for(var i = 0; i < obj.LStoValue.length; i++){
						if(value === obj.LStoValue[i][0]){
							value = obj.LStoValue[i][1];
							break;
						}
					}
				}
				targetType = typeof(value);
			}
		}else{
			switch(obj.type){
				case "boolean":
					value = value === "true";
					break;
				case "number":
					value = +value;
					break;
				case "custom":
					if(obj.LStoValueRegex !== undefined){
						for(var i = 0; i < obj.LStoValueRegex.length; i++){
							if(obj.LStoValueRegex[i][0].test(value)){
								value = obj.LStoValueRegex[i][1];
								break;
							}
						}
					}else{
						for(var i = 0; i < obj.LStoValue.length; i++){
							if(value === obj.LStoValue[i][0]){
								value = obj.LStoValue[i][1];
								break;
							}
						}
					}
					targetType = typeof(value);
					break;
			}
		}
		//restore data
		switch(targetType){
			case "boolean":
				target.prop("checked", this.invert ? !value : value);
				break;
			case "number":
			case "string":
				target.val(value);
				break;
			case "select":
				//works with Bootstrap dropdowns
				var selectTar = target.next().find("a[value='" + value + "']");
				selectTar.length && selectTar[0].choose.call(selectTar, undefined, true);
				break;
			case "radio":
				target = $("input[type=radio][name=" + obj.name + "]").each(function(){
					obj.onLoad.call(this);
				});
				break;
			case "static":
				target.text(value);
				break;
		}
		if(obj.changeAtInit) obj.onChange.call(target[0]);

		//store data upon changes
		target.on("change", function(e){
			//changed value
			var cValue;
			switch(targetType){
				case "boolean":
					cValue = target[0].checked;
					break;
				case "number":
				case "string":
				case "select":
					cValue = target.val();
					break;
			}
			if(obj.type === "custom"){
				if(obj.LStoValueRegex !== undefined){
						obj.regexAction.call(target, e);
						return false;
				}else{
					for(var i = 0; i < obj.LStoValue.length; i++){
						if(cValue === obj.LStoValue[i][1]){
							cValue = obj.LStoValue[i][0];
							break;
						}
					}
				}
			}
			if(obj.json !== undefined){
				json = JSON.parse(localStorage[obj.key]);
				json[obj.json] = cValue;
				localStorage[obj.key] = JSON.stringify(json);
			}else{
				localStorage[obj.key] = cValue;
			}
			obj.onChange.call(this, e);
		});

		//target onClick
		obj.onClick && target.click(obj.onClick);
	});
}

function menuSpy(){
	var top = document.body.scrollTop + 77 + 8;
	$("#sidebar a[href]").css({
		borderLeft: ""
	});
	$(".panel").each(function(){
		if(this.offsetTop <= top && top < this.offsetTop + this.clientHeight + 16 + 6){
			$("[href=\"#" + this.id + "\"]").css({
				borderLeft: "3px solid #428bca"
			});
		}
	});
}

function gly(icon){
	return $("<span>").addClass("glyphicon glyphicon-" + icon + " ")[0].outerHTML;
}

function dropdown(){
	$(".dropdown-menu > li > a").each(function(e){
		this.choose = function(e, noChangeEvent){
			$(this).parents("ul").first().find("li").removeClass("active");
			$(this).parent().addClass("active");
			$(this).parents("ul").first().prevAll("button").text($(this).text()).append(" <span class='caret'></span>")
			.val($(this).attr("value")).trigger(noChangeEvent ? "" : "change");
			e && e.preventDefault();
		};
		$(this).click(function(e){
			this.choose.call(this, e);
		});
	});
	$(".dropdown-toggle").each(function(){
		$(this).next().find("a").each(function(){
			if(!this.hasAttribute("value")) $(this).attr("value", $(this).text());
		});
		var specDefaultNode = $(this).next().find("a[selected]"),
			defaultNode = specDefaultNode.length > 0 ? specDefaultNode : $(this).next().find("a:eq(0)");
		defaultNode.click();
	});
}

function readFile(obj){
	var file = obj.files[0],
		reader = new FileReader(); 
	if(file.type.match('audio.mp3') || file.type.match('audio.ogg') || file.type.match('audio.wav')){  
	    var modal = createModal({
	    	title: "Processing...",
	    	content: "Please hold on for a second...",
	    	closeBtn: false
	    });
	    reader.onloadend = function(e){
	    	modal.modal("hide");
	    	try{
	    		obj.callback.call(e, e.target.result);
	    	}catch(err){
				showerror(err,e.target.result.length);
	    	}
	    };
	    reader.readAsDataURL(file);
	}else{
		var modal = createModal({
	    	title: "Ooops!",
	    	content: "Only accept .mp3 ,.ogg or .wav files."
	    });
    }
    if(obj.target){
    	$(obj.target).attr("value", "");
    }
}

function playSound(obj){
	obj = $.extend({
		data: "about:blank",
		onPlay: function(){},
		onEnded: function(){}
	}, obj);
	var audio = $("<audio>").attr({
		src: obj.data,
		class: "hide"
	}).appendTo("body");

	if(obj.steps !== undefined){
		var steps = function(){
			obj.steps.call(audio[0], audio[0].currentTime, audio[0].duration);
		};
		audio.on("ended", function(){
			steps();
			clearInterval(stepInterval);
		})
	}

	audio.on("play", function(e){ obj.onPlay.call(this, e); } );
	audio.on("ended", function(e){ obj.onEnded.call(this, e); } );

	var stepInterval;

	var controls = {
		node: audio[0],
		kill: function(){ audio.remove(); if(obj.link !== undefined){ play.unbind("click"); pause.unbind("click"); stop.unbind("click"); } },
		play: function(){ audio[0].play(); if(obj.steps !== undefined){ stepInterval = setInterval(steps, 100); } },
		pause: function(){ audio[0].pause(); if(obj.steps !== undefined){ clearInterval(stepInterval); } },
		stop: function(){ audio[0].pause(); audio[0].currentTime = 0; audio.trigger("ended"); },
		currentTime: function(){ return audio[0].currentTime; },
		duration: function(){ return audio[0].duration; }
	};

	if(obj.link !== undefined){
		var play = $(obj.link.play),
			pause = $(obj.link.pause),
			stop = $(obj.link.stop);
		play.click(function(){
			controls.play();
			$(this).attr("disabled", true);
			pause.attr("disabled", false);
			stop.attr("disabled", false);
		});
		pause.click(function(){
			controls.pause();
			$(this).attr("disabled", true);
			play.attr("disabled", false);
		});
		stop.click(function(){
			controls.stop();
		});
		audio.on("ended", function(){
			play.attr("disabled", false);
			pause.attr("disabled", true);
			stop.attr("disabled", true);
		});
	}

	return controls;
}