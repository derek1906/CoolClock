Components.define(function(){
	return function(namespace){
		namespace = "[" + namespace + "]";
		console.log.apply(console, arguments);
	};
});