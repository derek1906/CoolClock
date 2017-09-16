var Components = chrome.extension.getBackgroundPage().Components,
	AlarmClock = Components.getSingleton("AlarmClock");

var alarmList = [];

alarmList.push = function(){
	Array.prototype.push.apply(this, arguments);
	this.update();

};
alarmList.splice = function(){
	Array.prototype.splice.apply(this, arguments);
	this.update();
};

alarmList.update = function(){
	$("#count").text(alarmList.length)[alarmList.length ? "addClass" : "removeClass"]("running");
	$("#removeAll").prop("disabled", !alarmList.length);
};

$(function(){
	i18n.translate();

	$("gly").each(function(){
		$("<span>").addClass("glyphicon glyphicon-" + $(this).attr("icon") + " " +  $(this).attr("class")).insertAfter(this);
		$(this).remove();
	});

	$("*[data-toggle=tooltip]").each(function(){
		var placement = $(this).attr("data-placement");
		$(this).tooltip({placement: placement ? placement : "auto", delay:{show: 500, hide: 0}, container: "body"});
	});

	$("*").on("contextmenu", function(e){
		if(e.target.tagName !== "INPUT" || e.target.type !== "text"){
			e.preventDefault();
		}
		e.stopPropagation();
	});

	$("#add").click(function(){
		var config = $("#configure");
		this.innerHTML = gly(config.hasClass("collapsed")?($("#h").focus(),"minus"):"plus");
		config.toggleClass("collapsed");
	});

	$(".input-time > input").blur(function(){
		if(this.value === "") return;
		switch(this.id){
			case "h":
			if(+this.value > 24) this.value = 24;
			break;
			default:
			if(+this.value > 59) this.value = 59;
		}
		if(+this.value < 0) this.value = 0;
		if(this.value.length === 1) this.value = "0" + this.value;
	}).on("input", function(){
		this.value = this.value.replace(/[^0-9]/g, "").replace(/(\d\d)[0-9]/g, "$1");
		if(this.value.length == 2 || (this.id === "h" && +this.value > 2)) $(this).next().focus().select();
		$("#set").prop("disabled", ($("#h").val() === "" || $("#m").val() === ""));
	}).on("keydown", function(e){
		if(e.keyCode == 8 && this.value === ""){
			$(this).prev().select();
			e.preventDefault();
		}
	}).trigger("input");

	$(".input-time > input, #message").keydown(function(e){
		if(e.keyCode === 13 && $(this).parents("#configure").length){
			if($("#set:not(:disabled)").click().length){
				this.blur();
			}
		}
	});

	$("#daily").click(function(){
		$("#weekdays label").each(function(){
			if(!$(this).find("input").prop("checked")){
				this.click();
			}
		});
	});

	$("#set").click(function(){
		var setHour = +$("#h").val(),
			setMin = +$("#m").val(),
			setWkDays = [],
			setMsg = $("#message").val()
			//id = Date.now();

		$("#weekdays input").each(function(i){
			if(this.checked) setWkDays.push(i);
		});

		/*
		modifyEntry(id, function(list){
			list.push({
				hour: setHour,
				min: setMin,
				type: setWkDays.length ? "s" : "o",
				rang: false,
				day: setWkDays,
				text: setMsg,
				id: id,
				off: false
			});
		});

		alarmList.push(new Entry(id, {
			hour: setHour,
			min: setMin,
			day: setWkDays,
			text: setMsg,
			off: false
		}));
		*/
		var alarm = AlarmClock.create(setHour, setMin, {
			type: setWkDays.length ? "s" : "o",
			day: setWkDays,
			text: setMsg,
			off: false
		});
		alarmList.push(new Entry(alarm.id, alarm));

		$("#add").click();
		$("#configure *").blur();
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
					$.each(alarmList, function(i){
						var self = this;
						setTimeout(function(){
							self.remove();
						}, i * 100);
					});
					confirm.modal("hide").on('hidden.bs.modal', function(){
						$(this).remove();
					});
				}
			}]
		});
	});

	$(window).on("beforeunload", function(){
		//chrome.extension.getBackgroundPage().Functions.storeWindowSize(window, location);
		Components.getSingleton("WindowManager").registerOnClose(window);
	});

	init();
});



function gly(icon){
	return $("<span>").addClass("glyphicon glyphicon-" + icon + " ")[0].outerHTML;
}

function Entry(id, data, init){
	var block = $("<div>").addClass("block"),
		bContent = $("<div>").addClass("bContent").appendTo(block),
		controls = $("<div>").addClass("controls").appendTo(bContent),
		editCheckmarkDiv = $("<div>").addClass("editCheckmark").appendTo(bContent),
		editCheckmark = $("<span>").attr({"data-toggle": "tooltip", title: "Done", "data-placement": "right"}).html(gly("ok")).appendTo(editCheckmarkDiv).tooltip({container: bContent, delay: {show: 300}}),
		deleteBtn = $("<span>").attr({"data-toggle": "tooltip", title: "Delete", "data-placement": "right"}).html(gly("trash")).appendTo(controls).tooltip({container: bContent, delay: {show: 300}}),
		editBtn = $("<span>").attr({"data-toggle": "tooltip", title: "Edit", "data-placement": "right"}).html(gly("pencil")).appendTo(controls).tooltip({container: bContent, delay: {show: 300}}),
		enableBtn = $("<span>").attr({"data-toggle": "tooltip", title: "Toggle on/off", "data-placement": "right"}).html(gly("off")).appendTo(controls).tooltip({container: bContent, delay: {show: 300}}),
		wrapper = $("<div>").addClass("wrapper").appendTo(bContent),
		leftPanel = $("<div>").addClass("left-panel").appendTo(wrapper),
		time = $("<div>").addClass("time").appendTo(leftPanel),
		weekdays = $("<ul>").addClass("weekdays").appendTo(leftPanel),
		rightPanel = $("<div>").addClass("right-panel").appendTo(wrapper),
		msgTitle = $("<div>").addClass("record-title").text("Message").appendTo(rightPanel),
		message = $("<div>").addClass("message").appendTo(rightPanel);

		if(init){
			block.appendTo("#record");
		}else{
			block.prependTo("#record").addClass("animate collapsed shrink").delay(10).queue(function(){
				$(this).removeClass("collapsed");
			});
			setTimeout(function(){
				block.removeClass("shrink");
			},310);
		}

	var editting = false;

	var commands = {
		node: block,
		id: id,
		setTime: function(hr, min){
			time.text(("0" + hr).slice(-2)+":"+("0" + min).slice(-2));
			return this;
		},
		setMode: function(dayBool){
			block.removeClass("day night").addClass(dayBool ? "day" : "night");
			return this;
		},
		setMessage: function(msgStr){
			message.text(msgStr||"-");
			return this;
		},
		setWkdays: function(list){
			weekdays.empty();
			if(typeof list === "string"){
				$("<li>").text(list).addClass("active").appendTo(weekdays);
			}else if(Array.isArray(list)){
				for(var i = 0; i < 7; i++){
					$("<li>").text("SMTWTFS".split("")[i]).addClass(list.indexOf(i) > -1 ? "active": "").appendTo(weekdays);
				}
			}
			return this;
		},
		setOff: function(offBool){
			block[offBool?"addClass":"removeClass"]("off");
			return this;
		},
		remove: function(){
			/*
			modifyEntry(id, function(list, i){
				list.splice(i, 1);
			});
			*/
			AlarmClock.remove(id);

			block.addClass("animate shrink");
			setTimeout(function(){
				block.addClass("collapsed");
				setTimeout(function(){
					block.remove();
				}, 300);
			}, 300);
			for(var i = 0; i < alarmList.length; i++){
				if(alarmList[i].id === id){
					alarmList.splice(i, 1);
					break;
				}
			}
		},
		toggleEdit: function(){
			editting = !editting;
			if(editting){
				chrome.extension.getBackgroundPage().createNoti({
					title: "Click on the part you wish to edit.",
					message: "When done, click the checkmark to finish."
				},{ time: 7000});
			}
			block.toggleClass("edit");
		},
		update: function(){
			this
				.setTime(data.hour, data.min)
				.setMode(data.hour < 18 && data.hour >= 6)
				.setMessage(data.text)
				.setWkdays((data.type==="o"||!data.day.length)?"Once":(data.type==="d"?[0,1,2,3,4,5,6]:data.day))
				.setOff(data.off);
		}
	};
	commands.update();

	deleteBtn.click(commands.remove);
	enableBtn.click(function(){
		/*
		modifyEntry(id, function(){
			this.off = !this.off;
			commands.setOff(this.off);
		});
		*/
		data.set("off", !data.off);
		commands.setOff(data.off);
	});
	editBtn.click(commands.toggleEdit);
	editCheckmark.click(function(){
		commands.toggleEdit();
	});

	time.click(function(){
		if(editting){
			var content = $("<div>"),
				label = $("#h").parent().prev().clone().appendTo(content),
				time = $("#h").parent().clone(true).css({"text-align": "center"}).appendTo(content);

			$([label, time]).find("*").removeAttr("id");

			var h = time.find("input").eq(0).val(data.hour),
				m = time.find("input").eq(1).val(data.min);

			time.find("input").trigger("blur");

			var modal = createModal({
				title: "Editing",
				content: content,
				closeBtn: false,
				buttons: [{
					title: "Apply Edit",
					primary: true,
					onclick: function(){
						if(h.val() !== "" && m.val() !== ""){
							/*
							data = modifyEntry(id, function(){
								this.hour = +h.val();
								this.min = +m.val();
							});
							*/
							data.set({
								hour: +h.val(),
								min: +m.val()
							});
							commands.update();
							modal.modal("hide");
						}
					}
				},{
					title: "Finish Edit",
					primary: true,
					onclick: function(){
						if(h.val() !== "" && m.val() !== ""){
							/*
							data = modifyEntry(id, function(){
								this.hour = +h.val();
								this.min = +m.val();
							});
							*/
							data.set({
								hour: +h.val(),
								min: +m.val()
							});
							commands.update();
							modal.modal("hide");
							modal.on("hidden.bs.modal", commands.toggleEdit);
						}
					}
				},{
					title: i18n("cancel"),
					onclick: function(){
						modal.modal("hide");
					}
				}],
				onShown: function(){
					time.find("input").eq(0).focus();
				}
			});
		}
	});
	message.click(function(){
		if(editting){
			var content = $("<div>"),
				label = $("#message").parent().prev().clone().appendTo(content),
				msg = $("#message").parent().clone().css({"text-align": "center"}).appendTo(content);

			$([label, msg]).find("*").removeAttr("id");

			msg.find("input").val(data.text);

			var modal = createModal({
				title: "Editing",
				content: content,
				closeBtn: false,
				buttons: [{
					title: "Apply Edit",
					primary: true,
					onclick: function(){
						/*
						data = modifyEntry(id, function(){
							this.text = msg.find("input").val();
						});
						*/
						data.set("text", msg.find("input").val());
						commands.update();
						modal.modal("hide");
					}
				},{
					title: "Finish Edit",
					primary: true,
					onclick: function(){
						/*
						data = modifyEntry(id, function(){
							this.text = msg.find("input").val();
						});
						*/
						data.set("text", msg.find("input").val());
						commands.update();
						modal.modal("hide");
						modal.on("hidden.bs.modal", commands.toggleEdit);
					}
				},{
					title: i18n("cancel"),
					onclick: function(){
						modal.modal("hide");
					}
				}],
				onShown: function(){
					msg.find("input").focus();
				}
			});
		}
	});
	weekdays.click(function(){
		if(editting){
			var content = $("<div>"),
				label = $("#weekdays").parent().prev().clone().appendTo(content),
				wkd = $("#weekdays").parent().clone().css({"text-align": "center"}).appendTo(content);

			$([label, wkd]).find("*").removeAttr("id");
			label.find("button").click(function(){
				wkd.find("label").each(function(){
					if(!$(this).find("input").prop("checked")){
						this.click();
					}
				});
			});

			var modal = createModal({
				title: "Editing",
				content: content,
				closeBtn: false,
				buttons: [{
					title: "Apply Edit",
					primary: true,
					onclick: function(){
						/*
						data = modifyEntry(id, function(){
							var setWkDays = [];
							wkd.find("input").each(function(i){
								if(this.checked) setWkDays.push(i);
							});
							this.day = setWkDays;
							this.type = setWkDays.length ? "s" : "o";
						});
						*/
						var setWkDays = [];
						wkd.find("input").each(function(i){
							if(this.checked) setWkDays.push(i);
						});
						data.set({
							day: setWkDays,
							type: setWkDays.length ? "s" : "o"
						});
						commands.update();
						modal.modal("hide");
					}
				},{
					title: "Finish Edit",
					primary: true,
					onclick: function(){
						/*
						data = modifyEntry(id, function(){
							var setWkDays = [];
							wkd.find("input").each(function(i){
								if(this.checked) setWkDays.push(i);
							});
							this.day = setWkDays;
							this.type = setWkDays.length ? "s" : "o";
						});
						*/
						var setWkDays = [];
						wkd.find("input").each(function(i){
							if(this.checked) setWkDays.push(i);
						});
						data.set({
							day: setWkDays,
							type: setWkDays.length ? "s" : "o"
						});
						commands.update();
						modal.modal("hide");
						modal.on("hidden.bs.modal", commands.toggleEdit);
					}
				},{
					title: i18n("cancel"),
					onclick: function(){
						modal.modal("hide");
					}
				}],
				onShown: function(){
					$.each(data.day, function(){
						wkd.find("label").eq(this).click();
					});
				}
			});
		}
	});

	return commands;
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
	});

	return modal;
}
createModal = function(options){
	return chrome.extension.getBackgroundPage().Functions.createModal(options, window);
}

/*
function modifyEntry(id, callback){
	var list = JSON.parse(localStorage["alarm"]);
	if(!list.length){
		callback.call(undefined, list, -1);
	}else{
		for(var i = 0; i < list.length;i++){
			if(list[i].id === id){
				callback.call(list[i], list, i);
				break;
			}else if(i == list.length - 1){
				callback.call(undefined, list, -1);
				break;
			}
		}
	}
	localStorage["alarm"] = JSON.stringify(list);
	for(var i = 0; i < list.length;i++){
		if(list[i].id === id){
			return list[i];
		}
	}
}*/

function init(){
	// var list = JSON.parse(localStorage["alarm"]);
	var list = Components.getSingleton("AlarmClock").getAll();
	for(var i = 0; i < list.length; i++){
		alarmList.push(new Entry(list[i].id, list[i], true));
	}
	if(!list.length || location.hash === "#set"){
		location.hash = "";
		$("#add").click();
		$("#hour").focus();
	}
}