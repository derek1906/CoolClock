var speech = {
	vars: {
		"known": false,
		"regexp": {
			"time": /^(what is|what's|whats|what)( the)? time( is it)?( now)?$/i,
			"name": /^(What( is|'s|s) your name|Who are you)$/i,
			"badword": /(^| )(fuck|shit|bitch|ass)( |$)/i,
			"hi": /^(hi|hello|what(')?s up)$/i,
			"thank": /^(thank you|thank(s)?)$/i,
			"what": /^((do )?you know )?what(\'s|s| is|\'re|re| are)( a| an)? (.+)$/i,
			"help": /^(((I )?need )?help( me)?)|(commands)$/i,
			"sing": /^(can you )?sing$/i,
			"bye": /^((good( )?)?bye( bye)?|see (ya|you)|close|exit)$/i,
			"coolclock": /cool clock/i,
			"start": /^(start|set|add)( (a(n)?|the))? (.+)$/i
		},
		//Used in collecting feedback from user
		"using": undefined,
		//Background page
		"bg": chrome.extension.getBackgroundPage()
	},
	init: function(){
		if(!this.txt){
			this.vars.txt = $("input#speech").attr("value");
		}
		this.print({text:"Voice Control. version 0.1"});
		if(navigator.onLine){
			this.print({speech: "", text: this.choice(["Welcome","Hi there"])+"! Press the button below to begin. You can tell me to do specific things such as \"What time is it?\". Say \"help\" for more examples.",cp:true});
		}else{
			this.print({text: "Voice Control not available. Please connect to the Internet.", cp: true});
			$("#speech, #text").prop("disabled", true);
		}
		
		var self = this, listening = false, recognition;
		$("#speech").click(function(){
			var btn = $(this);
			chrome.tts.stop();
			if(!listening){
				recognition = new webkitSpeechRecognition();
			    recognition.onstart = function (e) {
			    	btn.addClass("listening");
			    	listening = true;
			    }
			    recognition.onresult = function (e) {
			    	self.vars.txt = e.results[0][0].transcript;
			    	self.handle(self.vars.txt.replace(/</g,"&lt;"));
			    	btn.removeClass("listening");
			    	listening = false;
			    }
			    recognition.onerror = function (e) {
			    	if(e.error !== "no-speech" && e.error !== "aborted"){
			    		self.vars.bg.createNoti({title: "An error has occured.", message: "Error: " + e.error},{time: 5000});
			    	}
					btn.removeClass("listening");
					listening = false;
			    }
			    recognition.onend = function (e) {
			    	btn.removeClass("listening");
			    	listening = false;
			    }
			    recognition.lang = "en";
			    recognition.start();
			}else{
				recognition.stop();
				listening = false;
			}

		});
		$("body").css({
			"height": $(window).height()
		});
		// setInterval(function() {
		//	if ($("input#speech").attr("value") != self.vars.txt) {
		//		self.vars.txt = $("input#speech").attr("value");
		//		self.handle(self.vars.txt.replace(/</g,"&lt;"));
		//	}
		// }, 200);
		$("input#text").keydown(function(e){
			if(e.keyCode == 13){
				self.vars.txt = this.value;
				$(this).val("");
				self.handle(self.vars.txt.replace(/</g,"&lt;"));
			}
		});
	},
	handle: function(txt){
		var reg = this.vars.regexp,
			print = this.print,
			known = this.known,
			vars = this.vars,
			self = this;
		print({text:txt, cp: false});
		txt = txt.replace(/([.,?!]|hey)/g,"").replace(/^\s+/,"").replace(/( +)?please( +)?/gi,"");
		if(vars.using){
			vars.using(txt);
		}else{
			for (var key in reg) {
				if (reg[key].test(txt) && txt != "" && !vars.known) {
					var match = txt.match(reg[key]);
					switch (key) {
					case "time":
						print({text:"The time is " + new Date() + ".", cp: true});
						known();
						break;
					case "name":
						print({text:"I don't actually know.", cp: true});
						known();
						break;
					case "badword":
						print({text:this.choice(["Hey! What was that?","What's that? Profanities are bad for your health."]), cp: true});
						known();
						break;
					case "hi":
						print({text:this.choice(["Hi there!","Hello!","What's up!"]), cp: true});
						known();
						break;
					case "thank":
						print({text:this.choice(["You're welcome!","I am glad to help you out!","Yup."]), cp: true});
						known();
						break;
					case "what":
						print({speech: "Here's a link to Google", text:"Search \"" + match[5] +"\" in Google:<br><a href=\"http://www.google.com/search?q=" + match[5] + "\" target=\"_blank\">" + match[5] + "</a>", cp: true});
						known();
						break;
					case "help":
						print({text:"For example, you can say \"What is the time?\" to ask for time, or say \"Start the timer\" to start the timer; say \"set an alarm\" to set an alarm, etc.", cp: true});
						known();
						break;
					case "sing":
						print({text:"Okay. [sings]", cp: true, speech: "Okay. Never gonna give you up, never gonna let you down, never gonna run around, and desert you. I think you just got rick rolled."});
						known();
						break;
					case "coolclock":
						print({text:"Yep, Cool Clock is one of the best clock extensions!", cp: true});
						known();
						break;
					case "bye":
						print({text:"See you later!", cp: true});
						known();
						setTimeout(function(){
							window.close();
						},2000);
						break;
					//Start a feature
					case "start":
						switch (match[5]) {
							//Timer
							case "timer":
								localStorage["timer_timestamp"]=Number(new Date());
								localStorage["timer_ori_timestamp"]=Number(new Date());
								print({text:"Okay, I have started the timer for you.<br><iframe src='timer.html' style='width:100%;'></iframe>", cp:true});
								break;
							//Countdown
							case "countdown":
								self.functions.setCountdown(self);
								break;
							//Alarm
							case "alarm":
								self.functions.setAlarm(self);
								break;
							default:
								print({text:"Sorry, but I don't know how to start a "+match[5]+".", cp: true});
						}
						known();
						break;
					}
				}
			}
			if (!vars.known) {
				var choice = this.choice([
						"I don't know what do you meant by \"" + txt + "\".",
						"Huh? What does \"" + txt + "\" mean?",
						"I don't understand \"" + txt + "\"."
					]);
				print({text:choice, cp: true});
			}
		}
		$("body").css({
			"height":"+="+(20+$(".dialog")[$(".dialog").length-3].offsetHeight+$(".dialog")[$(".dialog").length-4].offsetHeight)
		});
		this.reset();
		
	},
	print: function(obj){
		var txt = obj.text,
			cp = obj.cp,
			speech = obj.speech,
			callback = (obj.callback)?obj.callback:function(){};
		var ele = $("<div>").addClass("dialog").html(txt).appendTo("div#opt").css({
				"opacity": 0,
				"top": 50
			}).animate({
				"opacity": 1,
				"top": 0
			}, 500);
		if(cp){
			ele.addClass("cp");
			chrome.tts.speak(((typeof(speech)!="undefined")?speech:txt),{
				"voiceName": JSON.parse(localStorage["voice"]).voiceName,
				"rate": +JSON.parse(localStorage["voice"]).speed,
				"volume": 1,
				"pitch": 1,
				"rate": 1.001,
				"lang": "en-US",
				"requiredEventTypes": ['end'],
				"onEvent": function(event) {
					if(event.type === 'end') {
						callback();
					}
				}
			});
		}else{
			ele.addClass("you");
		}
	},
	known: function() {
		speech.vars.known = true;
	},
	reset: function(){
		speech.vars.txt = "";
		speech.vars.known = false;
		$("input#speech").attr("value", "").blur();
		//$(window).scrollTo("100%", 700);
		$("html, body").stop().animate({
			scrollTop: document.body.clientHeight - window.innerHeight
		}, 700);
	},
	choice: function(arr){
		return arr[Math.floor(Math.random()*(arr.length))];
	},
	options: function(func){
		var self = this;
		this.vars.using = function(txt){
			self.vars.using = undefined;
			func(txt);
		}
	},
	
	functions: {
		setCountdown: function(self){
			var CountdownTimer = self.vars.bg.Components.getSingleton("CountdownTimer");

			self.print({text:"Okay, how many seconds do you want it to be?", cp:true});
			self.options(function(txt){
				var ma = txt.match(/([0-9]+)/);
				if(ma){
					/*
					var list=JSON.parse(localStorage["countdown"]);
					list[list.length] = {start:Number(new Date()), end:Number(new Date())+ma[1]*1000, repeat:false, id: Date.now()};
					localStorage["countdown"]=JSON.stringify(list);
					self.vars.bg.checkruncd();
					self.print({text: "Okay, I have set it to "+(+ma[1])+" seconds.", cp:true, callback: self.vars.bg.countdown});
					*/
					CountdownTimer.create(Date.now() + ma[1] * 1000);
					self.print({text: "Okay, I have set it to "+(+ma[1])+" seconds.", cp:true, callback: CountdownTimer.displayUI});
				}else{
					self.print({text: "\""+txt+"\" is not a number.", cp: true});
				}
			});
		},
		setAlarm: function(self){
			var AlarmClock = self.vars.bg.Components.getSingleton("AlarmClock");
			var hour,
				min;
			self.print({text:"Okay, at what hour do you want to set?", cp:true});
			$("#speech").click();
			self.options(function(txt){
				txt = ((txt.length == 1)?"0":"")+txt;
				var ma = txt.match(/^([01]\d|2[0-3])$/);
				if(ma){
					hour = txt;
					self.print({text: "Okay, now, what minute do you want to set it to be?", cp: true});
					self.options(function(txt){
						txt = ((txt.length == 1)?"0":"")+txt;
						var ma = txt.match(/^([0-5]\d)$/);
						if(ma){
							min = txt;
							self.print({text:"So I will set the alarm at "+hour+":"+min+". Is that right?",cp:true});
							self.options(function(txt){
								var ma = txt.match(/^(yes|no)$/);
								if(ma){
									if(txt == "yes"){
										/*
										var obj = {
											hour : parseInt(hour,10),
											min : parseInt(min,10),
											type : "o",
											text : "",
											rang : false,
											day : [],
											id: Date.now()
										};
										if(!localStorage["alarm"]){
											localStorage["alarm"]="[]";
										}
										try{
											var list=JSON.parse(localStorage["alarm"]);
										}catch(err){
											alert("The alarm records are messed up. It will reset it now.");
											localStorage["alarm"] = "[]";
											var list=JSON.parse(localStorage["alarm"]);
										}
										list.push(obj);
										localStorage["alarm"] = JSON.stringify(list);
										self.print({text:"I have set an alarm at "+hour+":"+min+" for you.",cp:true});
										*/
										AlarmClock.create(+hour, +min);
										self.print({text:"I have set the alarm at "+hour+":"+min+" for you.",cp:true});
									}else{
										self.functions.setAlarm(self);
									}
								}else{
									self.print({text:"It is not a valid answer.",cp:true});
								}
							});
						}else{
							self.print({text: "\""+txt+"\" is not a valid minute or number.", cp: true});
						}
					});
				}else{
					self.print({text: "\""+txt+"\" is not a valid hour or number.", cp: true});
				}
			});
		}
	}
}