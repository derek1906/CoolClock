var timerList = [];

var Components = chrome.extension.getBackgroundPage().Components;
var CountdownTimer = Components.getSingleton("CountdownTimer");

$(function(){
	i18n.translate();

	$("gly").each(function(){
		$("<span>").addClass("glyphicon glyphicon-" + $(this).attr("icon") + " " +  $(this).attr("class")).insertAfter(this);
		$(this).remove();
	});

	$("#add").click(function(){
		var panel = $("#addpanel");
		panel.clearQueue().addClass("animate");
		if(panel.hasClass("shrink")){
			panel.removeClass("collapsed").delay(300).queue(function(){
				$(this).removeClass("shrink");
				$("#h").focus();
			});
			$(this).html(gly("minus"));
		}else{
			panel.addClass("shrink").delay(300).queue(function(){
				$(this).addClass("collapsed");
			});
			$(this).html(gly("plus"));
		}
	});

	$(".input-time > input").blur(function(){
		if(this.value === "") return;
		switch(this.id){
			case "h":
			if(+this.value > 99) this.value = 99;
			break;
			default:
			if(+this.value > 59) this.value = 59;
		}
		if(+this.value < 0) this.value = 0;
	}).on("input", function(){
		this.value = this.value.replace(/[^0-9]/g, "").replace(/(\d\d)[0-9]/g, "$1");
		if(this.value.length == 2) $(this).next().focus().select();
		$("#set").prop("disabled", (+$("#h").val() + +$("#m").val() + +$("#s").val() === 0));
	}).on("keydown", function(e){
		if(e.keyCode == 8 && this.value === ""){
			$(this).prev().select();
			e.preventDefault();
		}
	}).trigger("input");

	$(".input-time > input, #message").keydown(function(e){
		if(e.keyCode === 13){
			$("#set").click();
			this.blur();
		}
	});

	$(".input-color button").click(function(){
		$(".input-color button").removeClass("active");
		$(this).addClass("active");
		$(".input-color").data("value", this.value);
	});
	$(".input-color").data("value", "primary");

	$("#repeat").click(function(){
		var s = $(this).data("value");
		$(this).data("value", !s).toggleClass("active");
	}).data("value", false);

	$("#set").click(function(){
		if(!/^[0-9]+$/.test(""+$("#h").val()+$("#m").val()+$("#s").val())){
			//chrome.extension.getBackgroundPage().createNoti({title: "Did you just try to break the extension?", message: "Don't do that please."});
			return false;
		}
		var setTime = Date.now(),
			duration = +$("#h").val()*3600 + +$("#m").val()*60 + +$("#s").val(),
			endTime = setTime + duration * 1000,
			msg = $("#message").val(),
			color = $(".input-color").data("value"),
			repeat = $("#repeat").data("value");

		/*
		var settings = JSON.parse(localStorage["countdown"]), data = {
			start: setTime,
			end: endTime,
			repeat: repeat,
			color: color,
			message: msg,
			id: setTime
		};
		settings.push(data);
		localStorage["countdown"] = JSON.stringify(settings);
		chrome.extension.getBackgroundPage().checkruncd();
		*/
		var data = CountdownTimer.create(endTime, {
			message: msg,
			color: color,
			repeat: repeat
		});

		$("#add").html(gly("plus"));
		$("#addpanel").addClass("animate swipe");
		setTimeout(function(){
			$("#addpanel").removeClass("animate swipe").addClass("shrink collapsed");
			//timerList.push(new Entry(setTime, data));
			timerList.push(new Entry(data.id, data));
		}, 300);
	});

	$("#removeAll").click(function(){
		this.blur();

		var confirm = createModal({
			title: gly("info-sign") + " Are you sure?",
			content: "This cannot be reverted.",
			closeBtn: false,
			backdrop: "static",
			size: "sm",
			buttons: [{
				title: i18n("cancel"),
				primary: true,
				onclick: function(){
					confirm.modal("hide").on('hidden.bs.modal', function(){
						$(this).remove();
					});
				}
			}, {
				title: i18n("OK"),
				onclick: function(){
					$(".deleteBtn").each(function(i){
						var self = this;
						setTimeout(function(){
							self.click();
						}, i * 100);
					});
					confirm.modal("hide").on('hidden.bs.modal', function(){
						$(this).remove();
					});
				}
			}]
		});
	});

	$("*").on("contextmenu", function(e){
		return e.target.id === "message";
	}).on("keydown", function(e){
		if(e.keyCode == 116){
			e.preventDefault();
			return false;
		}
	});

	$(window).on("beforeunload", function(){
		//chrome.extension.getBackgroundPage().Functions.storeWindowSize(window, location);
		Components.getSingleton("WindowManager").registerOnClose(window);
	});

	init();
	update();


	if(i18n.lang() == "en"){
		$("<span>").addClass("plural").text("s").attr({
			"data-toggle": "tooltip",
			"data-placement": "bottom",
			"data-html": "true",
			"title": "Here at Cool Clock HQ, we treat grammar <i>very</i> seriously."
		}).appendTo("h1").tooltip();
	}
	$("*[data-toggle=tooltip]").tooltip({placement: "auto", delay:{show: 500, hide: 0}, container: "body"});
});

function gly(icon){
	return $("<span>").addClass("glyphicon glyphicon-" + icon + " ")[0].outerHTML;
}

function Entry(id, data, init){
	var block = $("<div>").addClass("block"),
		content = $("<div>").addClass("bContent").appendTo(block),
		progressBarWrapper = $("<div>").addClass("progress progress-striped active").appendTo(content),
		progressBar = $("<div>").addClass("progress-bar").css("width", "100%").attr("role", "progressbar").appendTo(progressBarWrapper),
		progressBarText = $("<div>").addClass("progress-bar-text").appendTo(progressBarWrapper),
		btnGroup = $("<div>").addClass("btn-group").before(' ').appendTo(content),
		deleteBtn = $("<button>").addClass("btn btn-default btn-xs deleteBtn").attr({title: "Delete", type: "button"}).html(gly("trash")).appendTo(btnGroup),
		repeatBtn = $("<button>").addClass("btn btn-default btn-xs").attr({title: "Toggle Repeat", type: "button"}).html(gly("repeat")).appendTo(btnGroup),
		message = $("<div>").addClass("message").appendTo(content)

		repeat = data.repeat;

		deleteBtn.click(function(){
			commands.remove();
		});
		repeatBtn.click(function(){
			repeatBtn.toggleClass("active");
			commands.setRepeat(!repeat);
		});

		if(init){
			block.appendTo("#content");
		}else{
			block.insertAfter("#addpanel").addClass("animate shrink");
			setTimeout(function(){
				block.removeClass("shrink");
			},10);
		}

	var commands = {
		node: block,
		id: id,
		setColor: function(type){
			var classN = "progress-bar progress-bar-" + type;
			if(progressBar.attr("class") !== classN){
				progressBar.attr("class", classN);
			}
		},
		setRemainingTime: function(text, percent){
			progressBar.css("width", percent + "%");
			progressBarText.text(text);
		},
		setMessage: function(text){ message.text(text); },
		setRepeat: function(bool){
			repeat = bool;
			repeatBtn[bool ? "addClass" : "removeClass"]("active");

			/*
			var list = JSON.parse(localStorage["countdown"]);
			for(var i = 0; i < list.length; i++){
				if(list[i].id == id){
					list[i].repeat = repeat;
					data = list[i];
				}
			}
			localStorage["countdown"] = JSON.stringify(list);
			*/
			data.set("repeat", bool);
		},
		remove: function(internal){
			/*
			var list = JSON.parse(localStorage["countdown"]);
			for(var i = 0; i < list.length; i++){
				if(list[i].id == id){
					list.splice(i, 1);
					break;
				}
			}
			localStorage["countdown"] = JSON.stringify(list);
			*/
			if(!internal)	CountdownTimer.remove(id);

			for(var i = 0; i < timerList.length; i++){
				if(id === timerList[i].id){
					timerList.splice(i, 1);
					break;
				}
			}
			block.addClass("animate shrink").delay(300).queue(function(){
				$(this).addClass("collapsed");
				setTimeout(function(){
					block.remove();
				}, 300);
			});
		},
		update: function(i){
			var remainingTime = data.end - Date.now();
			if(remainingTime <= 0 && !data.repeat){
				timerList.splice(i, 1);
				this.remove(true);
				return false;
			}else if(data.repeat){
				/*
				var list = JSON.parse(localStorage["countdown"]);
				for(var i = 0; i < list.length; i++){
					if(list[i].id === id){
						data = list[i];
						break;
					}
				}
				*/
				data = CountdownTimer.get(id);

				if(!data){
					// timer removed
					this.remove(true);
					return;
				}
			}
			this.setColor(data.color);
			this.setRemainingTime("Remaining Time: " + formatTime(Math.ceil(remainingTime/1000)),
				100-(Date.now() - data.start)/(data.end - data.start)*100);
			this.setMessage(data.message||"-");
			if(data.repeat !== repeatBtn.hasClass("active")) repeatBtn[data.repeat ? "addClass" : "removeClass"]("active");
		}
	};
	return commands;
}

function init(){
	/*
	var list = JSON.parse(localStorage["countdown"]);
	for(var i = 0; i < list.length; i++){
		timerList.push(new Entry(list[i].id, list[i], true));
	}
	*/
	var list = CountdownTimer.getAll();
	for(var i = 0; i < list.length; i++){
		timerList.push(new Entry(list[i].id, list[i], true));
	}

	if(timerList.length === 0){
		setTimeout(function(){
			$("#add").click();
		}, 200);
	}
}

function update(){
	for(var i = 0; i < timerList.length; i++){
		timerList[i].update(i);
	}
	$("#count").text(timerList.length)[timerList.length > 0 ? "addClass":"removeClass"]("running");
	if(timerList.length > 1){
		$("h1 > span").addClass("shows");
	}else{
		$("h1 > span").removeClass("shows");
	}
	$("#removeAll").prop("disabled", !timerList.length);
	setTimeout(update, 300);
}

function formatTime(sec){
	var h = (sec/3600)|0,
		m = (sec%3600/60)|0,
		s = sec%3600%60;
	return (h?(h+":"+(m<10?"0":"")):"") + m + ":" + ("0"+s).substr(-2);
}

function createModal(options){
	options = $.extend({
		title: "",
		content: "",
		backdrop: true,
		size: "lg",
		buttons: [],
		closeBtn: true,
		closeBtnText: i18n("close"),
		onClose: function(){}
	}, options);

	var modal = $("<div>").attr({
			"class": "modal fade",
			"role": "dialog"
		}).attr("data-backdrop", options.backdrop),
		dialog = $("<div>").attr({
			"class": "modal-dialog modal-" + options.size
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
	});

	return modal;
}