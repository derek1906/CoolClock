$(function(){
	move_it();
	setTimeout(function(){
		resize_it();
		resize_it();
		resize_it();
		move_it()
	},100);
	
	//inline
	$("#cc").attr("href", "http://creativecommons.org/licenses/by-sa/3.0/deed."+i18n.lang().replace(/-/g,"_"));

	//events
	$("body").on("contextmenu", function(e){
		e.preventDefault()
	});
	$(window).bind("resize", resize_it);
	$("body").on("keydown", function(e){
		if(e.keyCode != 9 && e.keyCode != 13){
			e.preventDefault();
		}
	});
	
	$("#close").click(function(){
		window.close();
	});
	
	//Translate
	i18n.translate();
});

function resize_it(){
	var ele = document.getElementsByTagName("div")[0];
	var w = ele.offsetWidth;
	var h = ele.offsetHeight;
	window.resizeTo(w/*+50*/+10,h+50/*+50*/);
}

function move_it(){
	var sw = screen.width;
	var sh = screen.height;
	var w = window.outerWidth;
	var h = window.outerHeight;
	window.moveTo(sw/2-w/2,sh/2-h/2-50);
}