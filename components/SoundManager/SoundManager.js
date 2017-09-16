/**
 * Manages audio
 */

Components.define(
	function(log, argFormatter){
		var storedSounds = {};

		/**
		 * @module Manager
		 */
		var manager = {
			/**
			 * Associate an Audio with a string name
			 *
			 * @param {string} name Name wished to associate with
			 * @param {string} [url] URL for the Audio
			 * 
			 * @return {Audio} Audio object
			 */
			create: function(){
				var input = argFormatter(arguments, {
					name: "SoundManager.create",
					definition: [
						{name: "name", type: "string"},
						{name: "url", type: "string", optional: true}
					]
				}, true)

				var args = input.arguments;

				var audio = new Audio();

				// sets error listener
				audio.addEventListener("error", function(){
					log("SoundManager", "Failed to load sound from %s", this.src);
				});

				if(args.url)	audio.src = args.url;

				return storedSounds[args.name] = audio;
			},

			/** Retrieve an Audio by name */
			getControls: function(name){
				return storedSounds[name];
			},

			/** Play an Audio by name */
			play: function(){
				var input = argFormatter(arguments, {
						name: "SoundManager.play",
						definition: [
							{name: "name", type: "string"},
							{name: "options", type: "object", optional: true, default: {
								fromStart: false,
								playFor: undefined,
								repeat: false
							}}
						]
					}, true),
					args = input.arguments;

				if(!(args.name in storedSounds))	return false;

				var audio = manager.getControls(args.name);

				audio.loop = !!args.options.repeat;	// set audio's repeat

				if(args.options.fromStart)	audio.currentTime = 0;	// set current time to 0 if fromStart is true
				if(args.options.playFor !== undefined){
					// pause audio after playFor milliseconds
					audio._playForTimer = setTimeout(function(){
						manager.pause(args.name);
					}, args.options.playFor);
				}
				
				audio.play();	// play the audio
			},

			/** Pause an Audio by name */
			pause: function(name){
				if(!(name in storedSounds))	return false;

				var audio = manager.getControls(name);

				audio.pause();	// pause audio

				clearTimeout(audio._playForTimer);	// stop previously set timer
			},

			/** Remove an Audio from the manager */
			remove: function(name){
				if(!(name in storedSounds))	return false;

				delete storedSounds[name];
				return true;
			}
		};

		return manager;
	}
);