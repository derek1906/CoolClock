Components.define(function(){
	return function(namespace){
		namespace = "[" + namespace + "]";
		console.warn.apply(console, arguments);
	};
});