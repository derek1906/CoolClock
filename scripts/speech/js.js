$(function(){
	speech.init();
	$("a#switch").click(function(){
		$("div.footer").toggleClass("speech text");
		if($(".footer").hasClass("text")){
			$("#text").focus();
		}
	});
	
	var vars = {
		window:{
			width: $(window).width(),
			height: $(window).height()
		}
	}
	//To make sure the scolling is fine
	$(window).resize(function(){
		var d_h = $(window).height() - vars.window.height;
		console.log($(window).height(),vars.window.height,d_h)
		$("body").css({
			"height": "+="+d_h
		});
		vars.window.height = $(window).height();
	}).on("beforeunload", function(){
			chrome.tts.stop();
	});
});