/**
 * Beware - Extremely old code ahead
 */

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
	}
	if(addition){
		for(var key in addition){
			entry[key] = addition[key];
		}
	}
	list[id].push(entry);
	localStorage["todo"] = JSON.stringify(list);
	return true;
}

function ajaxTodo(mode, result, callback){
	var list = $(result).find("entry"),
		count = 0;
	list.each(function(){
		var entry = $(this),
			title = entry.find("title").text(),
			startJSDate, endJSDate,
			place = entry.find("gd\\:where").attr("valueString"),
			name = $(result).find("author:eq(0) > name").text();
			
		if(entry.find("gd\\:when").attr("startTime") == undefined){
			console.log("Ignored");
			return true;
		}else if(/^\d\d\d\d-\d\d-\d\d$/.test(entry.find("gd\\:when").attr("startTime"))){
			var dateArray = entry.find("gd\\:when").attr("startTime").split("-");
			startJSDate = new Date(dateArray[0], dateArray[1]-1, dateArray[2]);
			dateArray = entry.find("gd\\:when").attr("endTime").split("-");
			endJSDate = new Date(dateArray[0], dateArray[1]-1, dateArray[2]);
			dateArray = undefined;
		}else{
			startJSDate = new Date(entry.find("> gd\\:when").attr("startTime"));
			endJSDate = new Date(entry.find("> gd\\:when").attr("endTime"));
		}
		
		var date = startJSDate,
			_year = date.getFullYear(),
			_month = date.getMonth() + 1,
			_date = date.getDate(),
			text = title,
			importFrom;

		if(mode === "public"){
			importFrom = name;
		}else if(mode === "private"){
			importFrom = "Private Calendar";
		}
			
		_month = ((_month < 10)? "0": "") + _month;
		_date = ((_date < 10)? "0": "") + _date;
		
		//if(_year == new Date().getFullYear() || _year == new Date().getFullYear() - 1){
			saveTodo(_year + "-" + _month + "-" + _date, text, {
				startTime: startJSDate,
				endTime: endJSDate,
				place: place,
				importFrom: importFrom
			});
			count++;
		//}
	});
	var msg = "Successfully imported " + count + " entries";
	if(mode == "private"){
		msg += " from \"" + $(result).find("author:eq(0) > email").text() + "\"";
	}
	msg += ".";
	
	if(callback){
		return callback(msg);
	}
	return msg;
}

function bgImportMyselfFeed(){
	for(i = 0; i<entry.length; i++){
		var data = entry[i].getElementsByTagName("title")[0].firstChild.nodeValue;
		var datatxt = entry[i].childNodes[6].getAttribute("startTime");
		var datatime = new Date(datatxt);
		var d = new Date();
		if(datatime.getYear() != d.getYear()){
			continue;
		}
		if(datatime.getMonth() != d.getMonth()){
			continue;
		}
		if(localStorage["todo"+(d.getMonth()+1)+datatime.getDate()] != null){
			console.log("Replaced to-do for "+(d.getMonth()+1)+"/"+datatime.getDate());
		}
		localStorage["todo"+(d.getMonth()+1)+datatime.getDate()] = data+" (From Google Calendar)";
		success++;
	}
}