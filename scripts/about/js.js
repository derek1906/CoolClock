$(function(){

	var i18n = chrome.extension.getBackgroundPage().i18n;
	i18n.translate(document);

	$("#version").text(chrome.runtime.getManifest().version);

	$("#settingsButton").click(function() {
		//location.href = "/options_new.html"
		chrome.runtime.openOptionsPage();
	});

	$("#updateLogButton").click(function() {
		location.href = "/update.html"
	});

	$("#permissionButton").click(function() {
		var modal = chrome.extension.getBackgroundPage().Functions.createModal({
			title: "Granted Origin Access Permissions",
			content: "Loading...",
			onShown: function(){
				chrome.permissions.getAll(function(permissions){
					var body = $(".modal-body", modal).empty();
					$("<p>")
						.text("This extension has granted permission to access the following origins:")
						.appendTo(body);

					var list = $("<ul>").appendTo(body);
					for(var i = 0; i < permissions.origins.length; i++){
						$("<li>").text(permissions.origins[i]).appendTo(list);
					}

					$("<p>")
						.text("Certain permissions are needed in order to grab weather/calendar data from the Internet.")
						.appendTo(body);
				});
			}
		}, window);
	});
});