/**
 * Omnibox handler
 * TODO: Fix behavior
 */

Components.define(function(WindowManager, AlarmClock){
	function showDefaultMessage(){
		chrome.omnibox.setDefaultSuggestion({
			description: "Enter command (search, add, about)"
		});
	}
	chrome.omnibox.onInputStarted.addListener(function() {
		showDefaultMessage();
	});
	chrome.omnibox.onInputChanged.addListener(function(query,suggest) {
		var txt = query.match(/^\S+\s(.+)$/i);
		txt = txt && txt[1];
		switch(query.match(/^\S+/i)[0]){
			case "search":
				var todo = storage.get("todo"),
					alarm = AlarmClock.getAll(),
					found = [];
					
				//search todo
				for(var key in todo){
					var list = todo[key];
					for(var i = 0; i < list.length; i++){
						var entry = list[i];
						if(entry.text.match(new RegExp(txt, "i")) != null){
							found.push({
								content: "search " + entry.text + " (todo)",
								description: "<dim>Todo: </dim>" + entry.text.replace(new RegExp("("+txt+")", "ig"), "<match>$1</match>") + "<dim> - " + formatDate([key.slice(0,4), key.slice(4,6), key.slice(6,8)].join("-")) + "</dim>"
							});
						}
					}
				}
				
				//search alarms
				for(var i = 0; i < alarm.length; i++){
					var entry = alarm[i];
					if(entry.text.match(new RegExp(txt, "i")) != null){
						found.push({
							content: "search " + entry.text + " (alarm)",
							description: "<dim>Alarm clock: </dim>" + entry.text.replace(new RegExp("("+txt+")", "ig"), "<match>$1</match>") + "<dim> - " + entry.getNextScheduledTime().timeString() + "</dim>"
						});
					}
				}
				if(found.length){
					suggest(found);
				}else{
					suggest([{
						content: "null",
						description: "No result for \"<url>" + txt+ "</url>\""
					}]);
				}
				
				chrome.omnibox.setDefaultSuggestion({
					description: "Searching for todos and alarms containing \"" + txt + "\" (" + found.length + " results)"
				});
				break;
			case "add":
				chrome.omnibox.setDefaultSuggestion({
					description: "To add a todo, type \"add YYYY-MM-DD content\" then press [enter]"
				});
				if(txt && /^\d{4}-\d{2}-\d{2}\s.+$/.test(txt)){
					var context = txt.match(/^\d{4}-\d{2}-\d{2}\s(.+)$/)[1],
						date = txt.match(/^(\d{4}-\d{2}-\d{2})/)[1];
					chrome.omnibox.setDefaultSuggestion({
						description: "Press [enter] to add todo \"" + context+ "\" on " + formatDate(date)
					});
				}
				break;
			case "about":
				chrome.omnibox.setDefaultSuggestion({
					description: "About Cool Clock..."
				});
				break;
			default:
				showDefaultMessage();
				break;
		}
	});

	chrome.omnibox.onInputEntered.addListener(function(query){
		var txt = query.match(/^\S+\s(.+)$/i),
			keyword = query.match(/^\S+/i);
		txt = txt && txt[1];
		switch(keyword[0]){
			case "search":
				var mode = txt.match(/\s\((.+)\)$/i);
				mode = mode && mode[1];
				console.log(txt,mode);
				switch(mode){
					case "todo":
						chrome.tabs.create({"url": "/calendar_full.html"});
						break;
					case "alarm":
						//window.open('alarmrecords.html','_blank','width=300,height=300,left=10,top=10');
						AlarmClock.displayUI();
						break;
				}
				break;
			case "add":
				if(txt && /^\d{4}-\d{2}-\d{2}\s.+$/.test(txt)){
					var context = txt.match(/^\d{4}-\d{2}-\d{2}\s(.+)$/)[1],
						date = txt.match(/^(\d{4}-\d{2}-\d{2})/)[1];
					
					date = date.split("-");
					console.log("Saved todo", date, text);
					var list = JSON.parse(localStorage["todo"]),
						id = date.join("");
					if(list[id] == null){
						list[id] = [];
					}
					var entry = {
						text: context,
						id: +new Date()
					};
					list[id].push(entry);
					localStorage["todo"] = JSON.stringify(list);
					
					createNoti({
						title: "Added todo on " + formatDate(date.join("-")),
						message: context
					},{
						time: 5000
					});
				}
				break;
			case "about":
				WindowManager.displayAbout();
		}
	});

	showDefaultMessage();

	return {};
});
