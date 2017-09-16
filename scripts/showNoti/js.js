$(function(){
	if(location.search){
		var search = decodeURIComponent(location.search).match(/[?&]([^?&]+)/g),
			title = search[0].match(/=(.+)$/)[1],
			content = search[1].match(/=(.+)$/)[1];
		$("#title").html(title);
		$("#content").html(content);
	}
});