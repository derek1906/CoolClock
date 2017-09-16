var Components = chrome.extension.getBackgroundPage().Components,
	i18n = chrome.extension.getBackgroundPage().i18n;

$(function(){
	Components.depends(function(Localization, storage, TimeTZ, SectionUptimeManager, Formatter){
		Localization.translatePage(document);

		if(storage.get("sectionuptimedata")){
			timeUsage();
			startTime();
			closeTime();
			$("#graphDisableBtn").button("disable").click(function(){
				storage.set("sectionuptimedata", false);
				location.reload();
			});
		}else{
			$("#graphs").after( $("<p>").text("Browser usage record has been disabled.") ).empty();
			$("#graphDisableBtn").button("enable").click(function(){
				storage.set("sectionuptimedata", true);
				location.reload();
			});
		}

		// fill in data
		$.each({
			timezone: (function(){
				var timezone = TimeTZ.getRealTimezone();
				return (timezone >= 0 ? "+" : "") + timezone;
			})(),
			sessionStartTime: i18n.dateTimeString(SectionUptimeManager.getInitTime())
		}, function(id){
			$("#"+id).text(this);
		});
		updateContent(SectionUptimeManager, Formatter);

		$("#graphResetBtn").click(function(){
			chrome.extension.getBackgroundPage().Functions.createModal({
				title: gly("info-sign") + " Confirm",
				content: "Are you sure?",
				closeBtn: false,
				backdrop: "static",
				buttons: [{
					title: i18n("cancel"),
					onclick: function(){
						this.modal("hide");
					}
				},{
					title: "Let's do this",
					style: "danger",
					onclick: function(){
						removeTable("section_uptime", function(){
							chrome.extension.getBackgroundPage().createNoti({
								title: "Data has been reset."
							}, {time: 3000});
							location.reload();
						});
						this.modal("hide");
					}
				}]
			}, window);
		});
	});
});

function gly(icon){
	return $("<span>").addClass("glyphicon glyphicon-" + icon + " ")[0].outerHTML;
}

function formatTime(sec){
	sec = Math.round(sec);
	var h = (sec/3600)|0,
		m = (sec%3600/60)|0,
		s = sec%3600%60;
	return (h?(h+":"+(m<10?"0":"")):"") + m + ":" + ("0"+s).substr(-2);
}

function updateContent(SectionUptimeManager, Formatter){
	var d = new Date();

	$.each({
		currentTime: i18n.dateTimeString(d),
		uptime: Formatter.format("duration", SectionUptimeManager.getCurrentRuntime() / 1000)
	}, function(id){
		$("#"+id).text(this);
	});

	setTimeout(function(){
		updateContent(SectionUptimeManager, Formatter)
	}, 1000 - d.getMilliseconds());
}

function displayTableData(title, header, data){
	var table = $("<table>").addClass("table table-striped table-hover"),
		head = $("<thead>").appendTo(table),
		headRow = $("<tr>").appendTo(head),
		body = $("<tbody>").appendTo(table);

	$.each(header, function(){
		$("<th>").text(this).appendTo(headRow);
	});
	$.each(data, function(){
		var row = $("<tr>").appendTo(body);
		$.each(this, function(){
			$("<td>").text(this).appendTo(row);
		});
	});

	chrome.extension.getBackgroundPage().Functions.createModal({
		title: title,
		content: table,
		size: "lg",
	}, window);
}

function readFromDB(name, column, callback, condition){
	var db = openDatabase('DB', '1.0', 'my database', 2 * 1024 * 1024);
	db.transaction(function (tx) {
	    tx.executeSql('SELECT * FROM ' + name + (condition ? " WHERE " + condition : ""),[],function(tx,r){
	    	var data = [];
	    	for(var i = r.rows.length-1; i >= 0 ; i--){  //reverse date ordering
	    		if(column){
	    			data.push(r.rows.item(i)[column]);
	    		}else{
	    			data.push(r.rows.item(i));
	    		}
	    	}
	    	callback(data);
	    });
	});
}

function removeTable(table, callback){
	var db = openDatabase('DB', '1.0', 'my database', 2 * 1024 * 1024);
	db.transaction(function (tx) {
		tx.executeSql('DELETE FROM ' + table, [], function(tx,r){
			callback.apply(window, arguments);
		});
	});
}

function timeUsage(){
	readFromDB("section_uptime", null, function(data){
		// _data = [];
		// for(i = 0; i < 1000; i++){
		// 	_data.push(Math.floor(Math.random()*1e3));
		// }
		var _data = $.map(data, function(d){
			return {usage: Math.round(d.ms/1000/60/60*10)/10, timestamp: d.timestamp, ms: d.ms};
		});

		var margin = {top: 30, right: 10, bottom: 30, left: 10},
		    width = 360 - margin.left - margin.right,
		    height = 350 - margin.top - margin.bottom;

		var x = d3.scale.linear()
				.domain([d3.min(_data, function(d){ return d.usage; }), d3.max(_data, function(d){ return d.usage; })])
				.range([0, width]);

		data = d3.layout.histogram()
				.bins(x.ticks(Math.min(_data.length-1, 10)))
				.value(function(d){ return d.usage; })
				(_data);

		var y = d3.scale.sqrt()
				.domain([0, d3.max(data, function(d){ return d.y; })])
				.range([height, 0]);

		var xAxis = d3.svg.axis()
				.scale(x)
				.orient("bottom");

		var svg = d3.select("#timeUsage").append("svg")
				.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		if(_data.length < 5){
			svg.append("text").text("Not enough data.").attr({
				x: "50%",
				"text-anchor": "middle"
			});
			return false;
		}

		var bar = svg.selectAll(".bar")
				.data(data)
				.enter().append("g")
				.attr({
					"class": "bar",
					transform: function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; }
				})
			    .on("click", function(d){
			    	var header = ["Start", "End", "Total Usage Time"],
			    		data = [];
			    	$.each(d, function(){
			    		var entry = this.valueOf();
			    		if(typeof entry === "object"){
			    			data.push([
			    				i18n.dateTimeString(new Date(entry.timestamp - entry.ms)),
			    				i18n.dateTimeString(new Date(entry.timestamp)),
			    				formatTime(Math.round(entry.ms/1000))
			    			]);
			    		}
			    	});
			    	displayTableData("Browser Usage Time Details", header, data);
			    });

		bar.append("rect")
			.attr({
				x: 1,
				width: Math.max(x(data[0].dx) - 1, 0),
				height: function(d) { return height - y(d.y); }
			});

		bar.append("text")
			.attr("class", "label")
		    .attr("dy", ".75em")
		    .attr("y", 6)
		    .attr("x", x(data[0].dx) / 2)
		    .attr("text-anchor", "middle")
		    .text(function(d) { return d3.format(",.0f")(d.y); });

		svg.append("g")
			.attr({
				"class": "x axis",
				transform: "translate(0, " + height + ")"
			})
			.call(xAxis)
			.append("text")
			.text("hours")
			.attr({
				"class": "axisLabel",
				x: "90%",
				y: 30,
				"text-anchor": "end"
			});

		svg.append("text")
			.text("Browser Usage Time")
			.attr({
				x: -10,
				y: -10
			});
	});
	
}

function startTime(){
	readFromDB("section_uptime", null, function(_data){
		data = [];
		for(var i = 0; i < 24; i++) data.push({hour: i, frequency: 0});
		$.each(_data, function(){
			var entry = data[new Date(this.timestamp - this.ms).getHours()];
			entry.frequency++;
			entry.dataset = entry.dataset || [];
			entry.dataset.push([
				this.timestamp - this.ms,
				this.timestamp,
				this.ms
			]);
		});

		var width = 360, height = 350, radius = 350 /2;

		var arc = d3.svg.arc()
				.outerRadius(radius - 20)
				.innerRadius(radius - 130);

		var pie = d3.layout.pie()
				.sort(null)
				.value(function(d){ return d.frequency; });

		var svg = d3.select("#startTime").append("svg")
				.attr({
					width: width,
					height: height,
					class: "pie"
				})
				.append("g")
				.attr("transform", "translate(" + (width/2+0.5) + "," + (height/2+0.5) + ")");

		var g = svg.selectAll(".arc")
				.data(pie(data))
				.enter().append("g")
				.attr("class", "arc")
				.on("click", function(d){
					var header = ["Start", "End", "Total Usage Time"],
						data = [];
					$.each(d.data.dataset, function(){
						data.push([
							i18n.dateTimeString(new Date(this[0])),
							i18n.dateTimeString(new Date(this[1])),
							formatTime(this[2]/1000)
						]);
					});

					var date = new Date();
					date.setHours(d.data.hour);
					var desc = Intl.DateTimeFormat(i18n.lang(),{
						hour: "numeric",
						hour12: true
					}).format(date);

					displayTableData("Browser Start Time Detail (" + desc + ")", header, data);
				});

		g.append("path")
				.attr("d", arc);

		g.append("text")
				.attr({
					transform: function(d){
						var rotation = ((d.endAngle + d.startAngle)/2)*180/Math.PI - 90;
						rotation += rotation < 0 ? 360 : 0;
						rotation -= rotation >= 90 && rotation <= 270 ? 180 : 0;
						rotation = d.endAngle - d.startAngle >= Math.PI ? 0 : rotation;
						return "translate(" + arc.centroid(d) + ")," + "rotate("+ rotation +")";
					},
					dy: ".35em"
				})
				.style("text-anchor", "middle")
				.text(function(d){
					var date = new Date();
					date.setHours(d.data.hour);
					var percentage = Math.round((d.endAngle - d.startAngle)/(Math.PI*2)*100);
					return d.data.frequency > 0 ?
						Intl.DateTimeFormat(i18n.lang(),{
							hour: "numeric",
							hour12: true
						}).format(date)+" ("+percentage+"%)" : "";
				});

		d3.select("#startTime svg").append("text")
			.text("Browser Start Time")
			.attr({
				x: 0,
				y: 20
			});

		$("#startTime text").each(function(){
			if(!$(this).text()){
				$(this).parents(".arc").remove();
			}
		});

	});

}

function closeTime(){
	readFromDB("section_uptime", null, function(_data){
		data = [];
		for(var i = 0; i < 24; i++) data.push({hour: i, frequency: 0});
		$.each(_data, function(){
			var entry = data[new Date(this.timestamp).getHours()];
			entry.frequency++;
			entry.dataset = entry.dataset || [];
			entry.dataset.push([
				this.timestamp - this.ms,
				this.timestamp,
				this.ms
			]);
		});

		var width = 360, height = 350, radius = 350 /2;

		var arc = d3.svg.arc()
				.outerRadius(radius - 20)
				.innerRadius(radius - 130);

		var pie = d3.layout.pie()
				.sort(null)
				.value(function(d){ return d.frequency; });

		var svg = d3.select("#closeTime").append("svg")
				.attr({
					width: width,
					height: height,
					class: "pie"
				})
				.append("g")
				.attr("transform", "translate(" + (width/2+0.5) + "," + (height/2+0.5) + ")");

		var g = svg.selectAll(".arc")
				.data(pie(data))
				.enter().append("g")
				.attr("class", "arc")
				.on("click", function(d){
					var header = ["Start", "End", "Total Usage Time"],
						data = [];
					$.each(d.data.dataset, function(){
						data.push([
							i18n.dateTimeString(new Date(this[0])),
							i18n.dateTimeString(new Date(this[1])),
							formatTime(this[2]/1000)
						]);
					});

					var date = new Date();
					date.setHours(d.data.hour);
					var desc = Intl.DateTimeFormat(i18n.lang(),{
						hour: "numeric",
						hour12: true
					}).format(date);

					displayTableData("Browser Close Time Detail (" + desc + ")", header, data);
				});

		g.append("path")
				.attr("d", arc);

		g.append("text")
				.attr({
					transform: function(d){
						var rotation = ((d.endAngle + d.startAngle)/2)*180/Math.PI - 90;
						rotation += rotation < 0 ? 360 : 0;
						rotation -= rotation >= 90 && rotation <= 270 ? 180 : 0;
						rotation = d.endAngle - d.startAngle >= Math.PI ? 0 : rotation;
						return "translate(" + arc.centroid(d) + ")," + "rotate("+ rotation +")";
					},
					dy: ".35em"
				})
				.style("text-anchor", "middle")
				.text(function(d){
					var date = new Date();
					date.setHours(d.data.hour);
					var percentage = Math.round((d.endAngle - d.startAngle)/(Math.PI*2)*100);
					return d.data.frequency > 0 ?
						Intl.DateTimeFormat(i18n.lang(),{
							hour: "numeric",
							hour12: true
						}).format(date)+" ("+percentage+"%)" : "";
				});

		d3.select("#closeTime svg").append("text")
			.text("Browser Close Time")
			.attr({
				x: 0,
				y: 20
			});

		$("#closeTime text").each(function(){
			if(!$(this).text()){
				$(this).parents(".arc").remove();
			}
		});

	});

}