var _current = [],
	isLower21 = parseInt(navigator.appVersion.match(/Chrome\/([^\s]+)\s/)[1], 10) < 21;
	
Number.prototype.addZero = function(){
	return (this < 10 ? "0" : "") + this;
};

function getURLParam(name) {
    return decodeURI(
        (RegExp(name + '=' + '(.+?)(&|$)').exec(location.search)||[,null])[1]
    );
}

function formatDate(date){
	var date = date.split("-"),
		obj = {
			Year: date[0],
			Month: date[1],
			Date: date[2]
		},
		refre = JSON.parse(localStorage["dateorder"]);
	
	return [ obj[refre["1"]], obj[refre["2"]], obj[refre["3"]] ].join("-");
}

$(function(){
	i18n.translate();
	_current = [new Date().getFullYear(), new Date().getMonth(), 1];
	$("#wrapper").append(createCalendar(_current, 1));
	initTodo();
	
	$("#menu").css({
		"max-width": $("#container").width()*0.33
	});
	
	//events
	$("#prevMonth").click(prevMonth);
	$("#nextMonth").click(nextMonth);
	$("#showAll").click(function(){
		$("div#menu").toggleClass("expanded");
	});
	$("#addTodo").click(function(){
		var d = new Date();
		createTodo(d.getFullYear() + "" + ((100+d.getMonth()+1)+"").slice(1,3) + d.getDate());
	});
	$("#showOptions").click(function(){
		$("#options").dialog("open");
	});
	$("#deleteAll").click(function(){
		$("<div title='Confirm'>").text("All events will be deleted. Continue?").dialog({
			show: {
				effect: "clip",
				duration: 300
			},
			hide: {
				effect: "clip",
				duration: 300
			},
			modal: true,
			draggable: false,
			resizable: false,
			closeOnEscape: false,
			closeText: i18n("close"),
			buttons: [
				{
					text: "Continue",
					click: function(){
						localStorage["todo"] = "{}";
						updateContent();
						$(this).dialog("close");
					}
				},{
					text: i18n("cancel"),
					click: function(){
						$(this).dialog("close");
					}
				}
			]
		});
	});
	$("#date").click(function(){
		$("#dateChoose").find("input[type='date']").val([_current[0],(_current[1]+1).addZero(),_current[2].addZero()].join("-")).end().dialog("open");
	});
	
	//dialogs
	$("#create_dialog").dialog({
		width: 500,
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
		draggable: false,
		resizable: false,
		closeOnEscape: false,
		closeText: i18n("close"),
		buttons: [
			{
				text: "Save",
				click: function(){
					if(
						saveTodo($("#create_date").val(), $("#create_text").val())
					){
						$(this).dialog("close").find("input, textarea").val("");
						updateContent();
					}
				}
			},{
				text: i18n("cancel"),
				click: function(){
					$(this).dialog("close");
				}
			}
		]
	});
	$("#view_dialog").dialog({
		width: 500,
		maxHeight: 700,
		autoOpen: false,
		show: {
			effect: "clip",
			duration: 300
		},
		hide: {
			effect: "clip",
			duration: 300
		},
		modal: false,
		draggable: true,
		resizable: false,
		closeOnEscape: false,
		closeText: i18n("close")
	});
	$("#options").attr("title", i18n("settings")).dialog({
		width: 600,
		maxHeight: 700,
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
		draggable: false,
		resizable: false,
		closeOnEscape: false,
		closeText: i18n("close"),
		buttons: [{
			text: "Done",
			click: function (){
				updateContent();
				$(this).dialog("close");
			}
		}]
	});
	$("#dateChoose").dialog({
		width: 500,
		maxHeight: 700,
		autoOpen: false,
		show: {
			effect: "clip",
			duration: 300
		},
		hide: {
			effect: "clip",
			duration: 300
		},
		modal: false,
		draggable: true,
		resizable: false,
		closeOnEscape: false,
		closeText: i18n("close"),
		buttons: [
			{
				text: "Today",
				click: function(){
					$(this).dialog("close");
					goToDate( [new Date().getFullYear(), (new Date().getMonth()+1).addZero(), "01"].join("-") );
				}
			},{
				text: i18n("OK"),
				click: function(){
					$(this).dialog("close");
					goToDate( $("#dateChoose > input[type='date']").val(), true);
				}
			},{
				text: i18n("cancel"),
				click: function(){
					$(this).dialog("close");
				}
			}
		]
	});
	
	//hash
	switch(location.hash.substr(1)){
		case "viewall":
			$("div#menu").toggleClass("expanded");
			break;
		case "settings":
			$("#options").dialog("open");
			break;
	};

	//Parameters
	if(getURLParam("timestamp")){
		goToDate(getURLParam("timestamp"), true);

	}
	
	//Restoring options
	$("#options input:eq(0)").attr("checked", localStorage["lunar"] == "true");
	
	//options
	$("#options input:eq(0)").change(function(){
		localStorage["lunar"] = this.checked.toString();
	});
	$("button#importCalendar").click(function(){
		var email = $(this).prev().val();
		if(email == ""){
			createAlert("You must enter a valid email address.", "Error");
			return false;
		}
		var noti = chrome.extension.getBackgroundPage().createNoti({
			title: "Fetching data...",
			message: "Please wait"
		});
		noti.show();
		email = encodeURIComponent(email);
		var startmin = encodeURIComponent(new Date(+new Date() - 1000*60*60*24*182).toISOString()),
			endmin = encodeURIComponent(new Date(new Date().getFullYear(), 11, 31).toISOString());
		$.ajax({
			type: "GET",
			url: "https://www.google.com/calendar/feeds/" + email + "/public/full?sortorder=ascending&max-results=547&start-min="+startmin+"&start-max="+endmin,
			dataType: "html",
			success: function(result) {
				ajaxTodo("public", result, function(msg){
					createAlert(msg);
					updateContent();
				});
				noti.cancel();
			},
			error: function(err){
				switch(err.status){
					case 404:
						createAlert("The calendar you entered does not exist.", "Error");
						break;
					case 403:
						createAlert("The calendar you entered is private.", "Error");
						break;
					case 400:
						createAlert("The calendar you entered does not allow to be received as XML.", "Error");
						break;
					default:
						createAlert("An unknow error oocured. Status: " + err.status, "Error");
				}
				noti.cancel();
			}
		});
	});
	$("button#importPrivateCalendar").click(function(){
		var startmin = encodeURIComponent(new Date(+new Date() - 1000*60*60*24*182).toISOString()),
			endmin = encodeURIComponent(new Date(new Date().getFullYear(), 11, 31).toISOString());
			
		var noti = chrome.extension.getBackgroundPage().createNoti({
			title: "Fetching data...",
			message: "Please wait"
		});
		noti.show();
		$.ajax({
			type: "GET",
			url: "https://calendar.google.com/feeds/default/private/embed?toolbar=false&max-results=50&start-min="+startmin+"&start-max="+endmin,
			dataType: "html",
			success: function(result) {
				ajaxTodo("private", result, function(msg){
					createAlert(msg);
					updateContent();
				});
				noti.cancel();
			},
			error: function(err){
				switch(err.status){
					case 404:
						createAlert("Calendar does not exist.", "Error");
						break;
					case 403:
						createAlert("Access denied.", "Error");
						break;
					case 400:
						createAlert("Calendar does not allow to be received as XML.", "Error");
						break;
					default:
						createAlert("An unknow error oocured. Status: " + err.status, "Error");
				}
				noti.cancel();
			}
		});
	});
	
	//Lowever than Chrome 21
	if(isLower21){
		$("#menu").css({
			height: $("body").height() - 86
		});		
	}
});

function createCalendar(obj, init){
	var date = new Date(obj[0], obj[1], obj[2]),
		header = $("#header"),
		content = $("<div>"),
		month = date.getMonth(),
		year = date.getFullYear(),
		chrome21row = [];
		
	if(init){
		header.append("<div><button id='showAll'></button><button id='prevMonth'>＜</button><span id='date'></span><button id='nextMonth'>＞</button><button id='showOptions'>...</button></div>");
		var days = $("<div>");
		for(var i = 0; i <= 6; i++){
			var cell = $("<div>");
			cell.text(i18n("day_" + i)).appendTo(days);
		}
		
		header.append(days);
	}
	
	$("#date").text(year +" " + i18n("month_" + (month + 1)));
	
	var dayLimit = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	if(year % 4 === 0) dayLimit[1] = 29;
	
	var preSpace = date.getDay(),
		prevMonth = (month-1 >= 0)? (month-1) : 11,
		prevYear = year - ((prevMonth == 11)? 1 : 0);
	for(var i = preSpace; i > 0; i--){
		var cell = $("<div>").addClass("grid prevDay"),
			digit = $("<div>").addClass("digit").text(dayLimit[prevMonth] - i + 1).appendTo(cell),
			todo = $("<div>").addClass("todoArea").appendTo(cell);
		cell.data({
			id: prevYear+((100+prevMonth+1)+"").slice(1,3)+((100+(dayLimit[prevMonth] - i + 1))+"").slice(1,3)
		});
		
		if(isLower21){
			chrome21row.push(cell);
		}else{
			cell.appendTo(content);
		}
	}
	
	for(var i = 1; i <= dayLimit[month]; i++){
		var cell = $("<div>").addClass("grid"),
			digit = $("<div>").addClass("digit").text(i).appendTo(cell),
			todo = $("<div>").addClass("todoArea").appendTo(cell);
		if(isLower21){
			chrome21row.push(cell);
		}else{
			cell.appendTo(content);
		}
		cell.data({
			id: year+((100+month+1)+"").slice(1,3)+((100+i)+"").slice(1,3)
		});
		var d = new Date();
		if(d.getFullYear() === year && d.getMonth() === month && d.getDate() === i){
			cell.addClass("today");
		}
		cell.click(function(){
			createTodo($(this).data("id"));
		});
	}
	
	var nextSpace = new Date(date.setMonth(month + 1)).getDay(),
		nextMonth = (month+1 <= 11)? (month+1) : 0,
		nextYear = year + ((prevMonth == 0)? 1 : 0);
	for(var i = 1; i <= 7 - nextSpace; i++){
		var cell = $("<div>").addClass("grid nextDay"),
			digit = $("<div>").addClass("digit").text(i).appendTo(cell),
			todo = $("<div>").addClass("todoArea").appendTo(cell);
		cell.data({
			id: nextYear + (nextMonth+1).addZero() + i.addZero()
		});
		if(isLower21){
			chrome21row.push(cell);
		}else{
			cell.appendTo(content);
		}
	}
	
	if(isLower21){
		for(var i = 0; i < chrome21row.length; i++){
			if(i%7 == 0){
				$("<div class='chrome21row'>").appendTo(content);
			}
			$("div.chrome21row:last-child", content).append(chrome21row[i]);
		}
	}
	
	//add content
	
	if(localStorage["lunar"] == "true"){
		$(content).find(".grid").each(function(i){
			var ele = this;
			setTimeout(function(){  //Lunar calendar is quite slow
				var div = $("<div>").addClass("lunar"),
					year = _current[0],
					month = +$(ele).data("id").slice(4,6),
					date = +$(ele).data("id").slice(-2);
				div.text(chrome.extension.getBackgroundPage().Functions.time().getCalendar("lunar", new Date(year,month,date)).slice(-2))
				$(ele).append(div);
			});
		});
	}
		
	return content.addClass("content");
}

function prevMonth(){
	_current[1] = _current[1] - 1
	if(_current[1] == -1){
		_current[1] = 11;
		_current[0] = _current[0] - 1;
	}
	var prev = createCalendar(_current);
	$("#wrapper").prepend(prev);
	var offset = 0-prev.height();
	if(isLower21){
		$(".content:last-child").remove();
	}else{
		$("#wrapper > .content").css({
			y: offset
		}).stop().transit({
			y: 0,
			duration: 300
		}).promise().done(function(){
			$(".content:last-child").remove();
		});
	}
	initTodo();
}

function nextMonth(){
	_current[1] = _current[1] + 1
	if(_current[1] == 12){
		_current[1] = 0;
		_current[0] = _current[0] + 1;
	}
	var next = createCalendar(_current);
	$("#wrapper").append(next);
	var offset = 0-next.height();
	if(isLower21){
		$(".content:first-child").remove();
	}else{
		$("#wrapper > .content").stop().transit({
			y: offset,
			duration: 300
		}).promise().done(function(){
			$(".content:first-child").remove();
			$("#wrapper > .content").css({
				y: 0
			})
		});
	}
	initTodo();
}

/*
 * {
 * 		yyyymmdd: [
 * 			{
 * 				text: "string",
 * 				id: timestamp
 * 			}, ...
 * 		], ...
 * }
 */
function initTodo(){
	$("#todo").empty();
	var list = JSON.parse(localStorage["todo"]),
		content = $("#todo");
	if(Object.keys(list).length == 0){
		content.html("No event.");
	}else{
		//find dates
		for(var key in list){
			var year = key.slice(0,4),
				month = key.slice(4,6),
				day = key.slice(6,8),
				whole = $("<div>").html($("<div class='legend'>"+ formatDate(year + "-" + month + "-" + day) +"</div>")),
				items = list[key];
				
			//find entries within the same date
			for(var i = 0; i < items.length; i++){
				var item = items[i],
					text = item.text,
					key = item.id,
					startTime = item.startTime,
					endTime = item.endTime,
					location = item.place,
					importFrom = item.importFrom,
					dateString = year + "-" + month + "-" + day,
					optString = text,
					entry = $("<div>").addClass("entry").html(text).data({date: dateString, key: key});
				if(startTime){
					startTime = ((100+new Date(startTime).getHours())+"").slice(1,3) + ":" + ((100+new Date(startTime).getMinutes())+"").slice(1,3);
					endTime = ((100+new Date(endTime).getHours())+"").slice(1,3) + ":" + ((100+new Date(endTime).getMinutes())+"").slice(1,3);
					optString += "<div class='additional'>Starting time: " + startTime + "<br>Ending time: " + endTime+"</div>";
				}
				if(location){
					optString += "<div class='additional'>Location: " + location +"</div>";
				}
				if(importFrom){
					optString += "<div class='additional'>Imported from: \"" + importFrom +"\"</div>";
				}
				optString += "<div class='additional'>Event ID: " + key +"</div>";
				entry.click((function(dateString, optString){
					return function(){
						$("#view_dialog").html(optString).dialog("option", "title", dateString).dialog("option", "buttons", [{
								text: "View",
								click: (function (data) {
									return function (){
										goToDate(data.date, true);
										$("#view_dialog").dialog("close");
									};
								})($(this).data())
							}, {
								text: "Delete",
								click: (function (data){
									 return function(){
										$("<div title='Comfirm delete?'>Todo will be deleted permanently.</div>").dialog({
											width: 500,
											show: {
												effect: "clip",
												duration: 300
											},
											hide: {
												effect: "clip",
												duration: 300
											},
											modal: true,
											draggable: false,
											resizable: false,
											closeOnEscape: false,
											closeText: i18n("close"),
											buttons: [{
												text: i18n("OK"),
												click: (function (data) {
													return function (){
														deleteTodo(data.date, data.key);
														updateContent();
														$(this).dialog("close");
														$("#view_dialog").dialog("close");
													};
												})(data)
											}, {
												text: i18n("cancel"),
												click: function () {
													$(this).dialog("close");
												}
											}]
										})
									 }
								})($(this).data())
							},{
								text: i18n("OK"),
								click: function(){
									$(this).dialog("close");
								}
							}
						]).dialog("open");
					}
				})(dateString, optString))
				
				whole.append(entry);
			}
			
			//Calendar
			
			if(year == _current[0] /*&& +month-1 == _current[1]*/){
				for(var i = 0; i < items.length; i++){
					var item = items[i],
						text = item.text,
						key = item.id,
						dateString = year + month + day,
						todoArea = $("#wrapper .grid").filter(function(){ return $.data(this, "id") == dateString; }).find(".todoArea");
					$("<div>").addClass("todoMemo").text(text).appendTo(todoArea);
				}
			}
			
			whole.appendTo(content);
		}
	}
}

function createTodo(id){
	$("#create_date").val(id.slice(0,4)+"-"+id.slice(4,6)+"-"+id.slice(6,8));
	$("#create_text").attr("autofocus", true);
	$("#create_dialog").dialog("open").one("dialogclose", function(){
		$("#create_text").attr("autofocus", false);
	})
}

function saveTodo(date, text, addition){
	if(text == "" || text == null || text == undefined){
		return false;
	}
	date = date.split("-");
	console.log("Saved todo", date, text);
	var list = JSON.parse(localStorage["todo"]),
		id = date.join("");
	if(list[id] == null){
		list[id] = [];
	}
	var entry = {
		text: text,
		id: +new Date()
	};
	if(addition){
		for(var key in addition){
			entry[key] = addition[key];
		}
	}
	list[id].push(entry);
	localStorage["todo"] = JSON.stringify(list);
	return true;
}

function deleteTodo(date, key){
	var date = date.split("-").join(""),
		list = JSON.parse(localStorage["todo"]),
		whole = list[date];
	for(var i = 0; i < whole.length; i++){
		var entry = whole[i];
		if(entry.id == key){
			whole.splice(i, 1);
			if(whole.length == 0){
				delete list[date];
			}
			break;
		}
	}
	localStorage["todo"] = JSON.stringify(list);
}

function updateContent(){
	$("#wrapper").empty().append(createCalendar(_current));
	initTodo();
}

function createAlert(txt, title){
	var modal = $("<div>").html(txt);
	if(title){
		modal.attr("title", title);
	}
	modal.dialog({
		show: {
			effect: "clip",
			duration: 300
		},
		hide: {
			effect: "clip",
			duration: 300
		},
		width: 500,
		modal: true,
		draggable: false,
		resizable: false,
		closeOnEscape: false,
		closeText: i18n("close"),
		buttons: [
			{
				text: i18n("OK"),
				click: function(){
					$(this).dialog("close")
				}
			}
		]
	});
	return modal;
}

function goToDate(date, focus){
	var date = date.split("-");
	date[0] = +date[0];
	date[2] = +date[2];
	var targetDate = +(date[0] + "" + date[1]),
		initDate = +(_current[0] + "" + (_current[1]+1).addZero());
	if( targetDate > initDate ){
		date[1] = ((+date[1])? (+date[1] - 1): 12) - 1;
		_current = date;
		nextMonth();
	}else if( targetDate == initDate ){
		return false;
	}else if( initDate > targetDate ){
		date[1] = ((+date[1] == 12)? 1: (+date[1] + 1)) - 1;
		_current = date;
		prevMonth();
	}
	if(focus){
		var target = $(".grid:not(.prevDay):not(.nextDay):nth(" + date[2]+ ")");
		(function(focus, defocus){
			for(var i = 0; i < 3; i++){
				setTimeout(focus, i * 1000 + 1000);
				setTimeout(defocus, i * 1000 + 1500);
			}
		})(function(){
			target.addClass("focus");
		}, function(){
			target.removeClass("focus");
		});
	}
}