Number.prototype.addZero = function(){
	return (this < 10 ? "0" : "") + this;
};

Number.prototype.format = function() {
	var txt = this,
		ms = txt % 1000;
    ms = Math.floor(ms / 1000 * 100);
    //I dont know why it has to +50 and -50.
    if(ms < 50) {
        ms += 50;
    } else if(ms >= 50) {
        ms -= 50;
    }
    txt /= 1000
    var hour = 0;
    var min = 0;
    var sec = 0;
    for(i = 0; i > -1; i++) {
        if(txt > 3600) {
            txt = txt - 3600;
            hour = hour + 1;
        } else {
            break;
        }
    }
    for(i = 0; i > -1; i++) {
        if(txt > 60) {
            txt = txt - 60;
            min = min + 1;
        } else {
            break;
        }
    }
    sec = txt.toFixed();
    if(sec == 60) {
        sec = 0;
        min = min + 1;
    }
    hour = hour ? hour.addZero() + ":" : "";
    min = min.addZero() ;
    sec = (+sec).addZero();
    ms = ms.addZero();
    var content = hour + min + ":" + sec
    if(window.units == true) {
        content = content.replace(/:/, "h ").replace(/:/, "m ") + "s"
    }
    return content
}

function createFlip(f, b) {
    var $world = $("<div>"),
        $flip = $("<div>"),
        $back = $("<div>"),
        $front = $("<div>");
    $world.addClass("world");
    $flip.addClass("flip");
    $front.html(f);
    $back.html(b);
    $world.append($flip);
    $flip.append($back, $front);

    $flip.css({
        transformOrigin: '50% 100%',
        perspective: '200px'
    }).find("div:first-child").css({
        rotateX: '180deg'
    })
        
        
    var $bg = $("<div>").addClass("bg");
    $bg.appendTo($world);
    for(var i = 0; i < 2; i++){
        var ele = $("<div>");
        ele.appendTo($bg);
        ele.html(i?f:b);
    }
        
    var obj = {
        flip: function(duration) {
            $("div.flip", $world).stop().transition({
                rotateX: '-180deg'
            }, duration).find("div:first-child").transition({
                "z-index": 1000
            }, duration);
        },
        dom: $world,
        arg: arguments
    }

    return obj;
}

	var play = true;

$(function(){
	(function(){
		setTimeout(arguments.callee, 1000);
		if(!play) return false;
		var creation = [
				[ new Date().applyTZ().getSeconds() , "#seconds" , "Seconds" ],
				[ new Date().applyTZ().getMinutes() , "#minutes" , "Minutes" ],
				[ new Date().applyTZ().getHours() , "#hours" , "Hours" ]
			];
			
		if(localStorage["pm"] == "true"){
			$("#apm").text(creation[2][0] < 12 ? i18n("am") : i18n("pm"));
			creation[2][0] = (creation[2][0] - (creation[2][0] <= 12 ? 0 : 12));
		}
		
		for( var cycle = 0 ; cycle < creation.length ; cycle++ ){
			var count = creation[cycle][0],
				next = nextDigit(creation[cycle]),
				i = (count < 10 ? "0" : "") + count,
				j = (next < 10 ? "0" : "") + next,
				first = createFlip(i.slice(0,1), j.slice(0,1)),
				second = createFlip(i.slice(1,2), j.slice(1,2));
			$(creation[cycle][1]).empty().append(
				first.dom,
				second.dom
			);
			
			var firstChange = (first.arg[0] != first.arg[1]);
			var secondChange = (second.arg[0] != second.arg[1]);
			
			firstChange ?
			(function(first, firstChange){
				setTimeout(function(){
					first.flip( firstChange ? 300 : 0);
				}, (firstChange ? Math.random() * 100 + 100 : 0));
			})(first, firstChange) :
			first.flip( 0 );
			
			second.flip( secondChange ? 300 : 0);
		}
	})();


	function nextDigit(creation){
		var d = new Date( +(new Date().applyTZ()) + 1000 )["get"+creation[2]]();
		if(creation[2] == "Hours" && d > 12 && localStorage["pm"] == "true"){
			d -= 12;
		}
		return d;
	}
	
	//===============
	
	var order = {
			Year: new Date().applyTZ().getFullYear(),
			Month: i18n("month_" + (new Date().applyTZ().getMonth() + 1)),
			Date: new Date().applyTZ().getDate()
		},
		list = JSON.parse(localStorage["dateorder"]);
	for( var i = 1; i <= 3; i++){
		if(i == 1){
			$("#big").text(order[list[i]]);
		}else{
			var ele = $("<span>");
			ele.text(order[list[i]]);
			$("#top").append(ele);
			(i == 2) && $("#top").append(", ");
		}
	}
	$("#bottom").append($("<span id='weekday'>").text(i18n("day_"+new Date().applyTZ().getDay())));
	if(localStorage["lunar"] == "true"){
		$("#bottom").append(" ‧ ", $("<span id='lunar'>").text(chrome.extension.getBackgroundPage().Functions.time().getCalendar("lunar")));
	}
	var hour = new Date().applyTZ().getHours(),
		greetings = "midnight";
	if(hour >= 5 && hour < 12){
		greetings = "morning";
	}else if(hour >= 12 && hour < 18){
		greetings = "noon";
	}else if(hour >= 18 && hour < 22){
		greetings = "evening";
	}else if(hour >= 22 && hour <= 23 || hour >= 0 && hour <= 2){
		greetings = "night";
	}
	$("#greetings").text(i18n(greetings));
	
	//===============
	//events
	$("body").on("contextmenu", function(e){
		return false;
	});
	$("#tools").click(function(){
		if($("#slideUp").hasClass("hide")){
			var blocker = $("<div id='blocker'>");
			blocker.appendTo("body");
			blocker.click(function(){
				$("#slideUp").addClass("hide");
				$(this).remove();
				setTimeout(function(){
					$("#slideUp").css("display", "none");
				}, 500);
			});
			$("#slideUp").css("display", "block")
			setTimeout(function(){
				$("#slideUp").removeClass("hide");
			},0);
		}else{
			$("#blocker").remove();
			$("#slideUp").addClass("hide");
			$(this).remove();
			setTimeout(function(){
				$("#slideUp").css("display", "none");
			});
		}
	});
	$("#slideUp > .wrapper > div").each(function(i){
		if(i == 0){
			$(this).click(function(){
				//window.open("addalarm.html","_blank","width=500,height=500");
				chrome.extension.getBackgroundPage().alarm();
				window.close();
			});
		}else if(i == 1){
			$(this).click(function(){
				$("#timerChoose").dialog("open");
			});
		}else if(i > 1){
			var list = [
				"/calendar_full.html",
				"/statistics.html"
			];
			$(this).click(function(){
				chrome.tabs.create({
					url: list[i-2]
				});
				window.close();
			});
		}
	});
	
	$("#settings").click(function(){
		chrome.tabs.create({
			url: "/options_new.html"
		});
	});
	$("#about").click(function(){
		chrome.tabs.create({
			url: "/about.html"
		});
	});
	$("#help").click(function(){
		chrome.tabs.create({
			url: "https://docs.google.com/document/d/1BhBnW1-mzGExFMwz7RtccqRGV6tvnzA1D7ZnyTqf5A8/pub"
		});
	});
	$("#forum").click(function(){
		chrome.tabs.create({
			url: "https://groups.google.com/forum/#!forum/chrome-clock"
		});
	});
	$("#bug").click(function(){
		chrome.tabs.create({
			url: "https://chrome.google.com/webstore/support/icegcmhgphfkgglbljbkdegiaaihifce#bug"
		});
	});
	$("#todos > span:eq(0)").click(function(){
		chrome.tabs.create({
			url: "/calendar_full.html"
		});
	});
	$("#alarms > span:eq(0)").click(function(){
		chrome.extension.getBackgroundPage().alarm();
		//window.open("/alarmrecords.html", "_blank", "width=100,height=100");
	});
	$("#countdowns > span:eq(0)").click(function(){
		chrome.extension.getBackgroundPage().countdown();
		//window.open("/addcountdown.html", "_blank", "width=100,height=100");
	});
	$("#board").hover(function(){
		$(this).data({
			hover: true
		});
	}, function(){
		$(this).data({
			hover: false
		});
	});
	
	$("#timerChoose > button").click(function(){
		var list = {
			countdown: "countdown",
			stopwatch: "timer"
		};
		chrome.extension.getBackgroundPage()[list[this.id]]();
		window.close();
		//window.open("/" + list[this.id] + ".html", "_blank", "width=100,height=100");
	});
	
	//===============
	//inline
	i18n.translate();
	$("#version").text(i18n("version") + " " + chrome.runtime.getManifest().version);
	
	$("#fblike").attr("src", 'https://www.facebook.com/plugins/like.php?href=https://www.facebook.com/coolclock&layout=button_count&show_faces=false&width=100&action=recommend&colorscheme=light&height=21');
	
	//===============
	
	//jQuery UI
	$("#timerChoose").dialog({
		autoOpen: false,
		show: {
			effect: "clip",
			duration: 300
		},
		hide: {
			effect: "clip",
			duration: 300
		},
		modal: true,
		draggable: true,
		resizable: false,
		closeOnEscape: false,
		closeText: i18n("close"),
		overlay: {
			opacity: 0, 
            background: "black"
		},
		open: function(){
            $('.ui-widget-overlay').css({
				opacity: 0.8,
				background: "-webkit-radial-gradient(center, ellipse cover, #AAA 50%,#888 100%)"
			}).hide().fadeIn(200);
        },
		close: function(){
			$('.ui-widget-overlay').css({
				opacity: ""
			})
		}
	}).find("button").button();
	
	
	//
	
	function update(){
		setTimeout(update, 1000);
		if($("#board").data("hover")){
			return false;
		}
		$("#board > div > ul").remove();
		
		//todos
		var todos = JSON.parse(localStorage["todo"]),
			date = new Date().applyTZ(),
			list = todos[date.getFullYear()+(date.getMonth()+1).addZero()+date.getDate().addZero()],
			ul = $("<ul>");
		if(list == undefined){
			ul.append($("<li>").html("No event"));
		}else{
			for(var i = 0; i < list.length; i++){
				ul.append($("<li>").html(list[i].text));
			}
		}
		$("#todos").append(ul);
		
		//===============
		//alarms
		var alarms = JSON.parse(localStorage["alarm"]),
			ul = $("<ul>");
		if(alarms.length == 0){
			ul.append($("<li>").html("No alarm"));
		}else{
			for(var i = 0; i < alarms.length; i++){
				var desc = "";
				if(alarms[i].text != ""){
					desc = " - " + alarms[i].text;
				}
				ul.append($("<li>").html("" + alarms[i].hour.addZero() +":"+ alarms[i].min.addZero() + desc));
			}
		}
		$("#alarms").append(ul);
		
		//===============
		//countdown
		var countdowns = JSON.parse(localStorage["countdown"]),
			ul = $("<ul>");
		if(countdowns.length == 0){
			ul.append($("<li>").html("No running countdown"));
		}else{
			for(var i = 0; i < countdowns.length; i++){
				ul.append($("<li>").html((i+1) + "| " + Math.floor(countdowns[i].end - new Date()).format()));
			}
		}
		$("#countdowns").append(ul);
		
	}
	update();
	
	//Konami Code
	//If you can see this... CHEATER
	var KOkeys = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	$("body").keydown(function (e) {
		KOkeys.splice(0, 1);
		KOkeys.push(e.keyCode);
		if(KOkeys.join("") === [38, 38, 40, 40, 37, 39, 37, 39, 66, 65].join("")){
			$("html").css({
				webkitUserSelect: "none"
			}).animate({
				width: 800,
				height: 600,
			}, 500, function(){
				window.gr = new gravity({
					boundaries: "document",
					debugDraw: true,
					dragging: true,
					yGravity: 20
				});
				$("#container > div > div, #misc > *, #content > div > div").css({
					cursor: "-webkit-grab",
					boxShadow: "0px 0px 5px #999"
				}).each(function(){
					window.gr.add(this, {
						fixed: false,
						restitution: 0.7,
						friction: 0.5,
						density: 100,
						includeChild: false
					});
					window.gr.torque(this, 100);
					window.gr.force(this, 0, 100+(Math.random()*10));
				});
				$("#content").unwrap().css({
					position: "static",
				});
				play = false;
				window.gr.load();
			});
			$("body").css({
				width: 600
			}).animate({
				marginLeft: 100,
				marginRight: 100
			}, {
				duration:500,
				queue: false
			});
				
		}
	});
});