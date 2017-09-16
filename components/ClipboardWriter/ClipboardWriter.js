/**
 * Clipboard writer
 */

Components.define(function(argFormatter){
	var defaultCallback = function(){},
		stringToBeCopied = "",
		callbackToBeCalled = defaultCallback;

	document.addEventListener("copy", function(e){
		// write to clipboard
		e.clipboardData.setData("text/plain", stringToBeCopied);
		e.preventDefault();

		// invoke callback
		callbackToBeCalled();

		// revert data
		stringToBeCopied = "";
		callbackToBeCalled = defaultCallback;
	});

	return {
		write: function(){
			var input = argFormatter(arguments, {
				name: "ClipboardWriter.write",
				definition: [
					{name: "str", type: "string"},
					{name: "callback", type: "function", optional: true, default: defaultCallback}
				]
			}, true),
				args = input.arguments;

			stringToBeCopied = args.str;
			callbackToBeCalled = args.callback;

			// trigger copy event listener
			document.execCommand("copy");
		}
	};
});