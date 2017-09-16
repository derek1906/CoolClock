Components.define(function(WindowManager){
	
	var app = {
		displayUI: function(){
			//WindowManager.create("/timer.html");
			chrome.windows.create({url: "/timer.html", type: "popup", width: 500, height: 200});
		}
	};

	return app;
});