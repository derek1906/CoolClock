/**
 * Writes time onto the currently selected input
 */

if(!this.listenerLoaded){
	chrome.runtime.onMessage.addListener(function(date, sender, respond){
		// select active element
		var textField = document.activeElement;

		date.emulated = new Date(date.emulated);

		// check if active element is a text field
		if(textField.tagName === 'INPUT'){
			switch(textField.type.toLowerCase()){
				case "email":
				case "search":
				case "text":
				case "url":
					// check if the text field is already filled by existing text
					if(textField.value.length && textField.value.charAt(textField.value.length - 1) !== " "){
						// prepend a space
						textField.value += " " + date.text;
					}else{
						textField.value += date.text;
					}

					break;

				case "date":
					// fill with current date
					textField.value = "" +	date.emulated.getFullYear() + "-" +
					                      	padZero(date.emulated.getMonth() + 1) + "-" +
					                      	padZero(date.emulated.getDate());
					break;

				case "month":
					// fill with current date
					textField.value = "" +	date.emulated.getFullYear() + "-" +
					                      	padZero(date.emulated.getMonth() + 1);
					break;

				case "time":
					// fill with current time
					textField.value = "" +	padZero(date.emulated.getHours()) + ":" +
					                      	padZero(date.emulated.getMinutes()) + ":" +
					                      	padZero(date.emulated.getSeconds());
					break;

				case "datetime-local":
					textField.value = "" +	date.emulated.getFullYear() + "-" +
					                      	padZero(date.emulated.getMonth() + 1) + "-" +
					                      	padZero(date.emulated.getDate()) + "T" +
					                      	padZero(date.emulated.getHours()) + ":" +
					                      	padZero(date.emulated.getMinutes()) + ":" +
					                      	padZero(date.emulated.getSeconds());
					break;

				default:
					respond(false);
					return;
			}
			// success
			respond(true);
		}else{
			// fail - not a supported text field
			respond(false);
		}
	});
	this.listenerLoaded = true;
}

function padZero(number){
	return (number < 10 ? "0" : "") + number;
}