$(function(){
	var i18n = chrome.extension.getBackgroundPage().i18n;
	$(".main h3").each(function(){
		var id = "v" + this.innerText.slice(5);
		this.id = id;
		$("<li>").append($("<a>").attr("href", "#"+id).text(this.innerText)).appendTo("#scrollSpy > ul");
	});
	$("#scrollSpy > ul").affix({
		offset: 180
	});
	$("body").scrollspy('refresh');

	$("h3[data-date]").each(function(){
		$("<small>").text("Release Date: " + i18n.dateString(new Date(+this.dataset.date))).insertAfter(this);
	});

	$("#footerYear").text(new Date().getFullYear());

	i18n.translate(document);
});