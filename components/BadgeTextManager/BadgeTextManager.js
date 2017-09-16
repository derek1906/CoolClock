/**
 * Handles all messages to display on badge.
 * 
 * Supports multiple messages and will pick the latest
 * one to display.
 *
 * Messages can be set to higher priority over other messages.
 *
 * Set a displayer to transform messages before displaying.
 */

Components.define(function(argFormatter){

	function Message(name){
		this.name = name;
	}
	Message.prototype.color = "#428bca";
	Message.prototype.set = function(text){
		internal.setMessage(this, text);
	};
	Message.prototype.setHighPriority = function(state){
		if(state)	internal.setHighPriority(this);
		else     	internal.removeHighPriority(this);
	};
	Message.prototype.getText = function(){
		var displayer = internal.definedDispalyers[this.name];

		return displayer ? displayer.call(this, this.text) : this.text;
	};
	Message.prototype.update = function(){
		if(internal.getTopMessage() === this){
			internal.update();
		}
	};

	var internal = {
		ongoingMessages: [],
		definedDispalyers: {},

		highPriorityMessage: null,

		getMessage: function(name){
			return internal.ongoingMessages.find(function(message){
				return message.name === name;
			});
		},
		setMessage: function(message, text){
			message.text = text;
			message.update();
		},
		removeMessage: function(message){
			internal.ongoingMessages.splice(internal.ongoingMessages.indexOf(message), 1);
			internal.removeHighPriority(message);
			internal.update();
		},
		setHighPriority: function(message){
			internal.highPriorityMessage = message;
			internal.update();
		},
		removeHighPriority: function(message){
			if(internal.highPriorityMessage === message)	internal.highPriorityMessage = null;
			internal.update();
		},
		getTopMessage: function(){
			if(internal.highPriorityMessage)         	return internal.highPriorityMessage;
			if(internal.ongoingMessages.length === 0)	return null;
			else                                     	return internal.ongoingMessages[internal.ongoingMessages.length - 1];
		},
		update: function(){
			var topMessage = internal.getTopMessage();

			chrome.browserAction.setBadgeText({ text: topMessage ? topMessage.getText() : "" });
			if(topMessage)	chrome.browserAction.setBadgeBackgroundColor({ color: topMessage.color });
		}
	};

	var app = {
		get: function(name){
			var input = argFormatter(arguments, {
				name: "BadgeTextManager.get",
				definition: [{name: "name", type: "string"}]
			}, true);

			return internal.getMessage(name);
		},
		set: function(name, text, color){
			var input = argFormatter(arguments, {
				name: "BadgeTextManager.set",
				definition: [{name: "name", type: "string"}, {name: "text", type: "string"}, {name: "text", type: "string"}]
			}, true), args = input.arguments;

			var message = internal.getMessage(name);

			if(!message){
				message = new Message(name);
				internal.ongoingMessages.push(message);
			}

			message.color = color;
			message.set(text);

			return message;
		},
		remove: function(name){
			var input = argFormatter(arguments, {
				name: "BadgeTextManager.remove",
				definition: [{name: "name", type: "string"}]
			}, true), args = input.arguments;

			var message = internal.getMessage(name);

			if(!message)	return false;
			else        	return internal.removeMessage(message), true;
		},
		setDisplayer: function(name, displayer){
			var input = argFormatter(arguments, {
				name: "BadgeTextManager.setDisplayer",
				definition: [{name: "name", type: "string"}, {name: "displayer", type: "function"}]
			}, true), args = input.arguments;

			internal.definedDispalyers[name] = displayer;

			var message = internal.getMessage(name);

			if(message)	message.update();
		}
	};

	return app;
});