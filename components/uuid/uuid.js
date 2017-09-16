/**
 * UUID generator
 */

Components.define(function(){
	/**
	 * Generate a UUID
	 * @return {string} UUID
	 *
	 * @license http://stackoverflow.com/a/2117523/ CC-BY SA 3.0
	 */
	return function(){
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
		    return v.toString(16);
		});
	};
});