/**
 * Simple implementation of normalizing arguments
 */

Components.define(function(){
	function checkArg(arg, argDefinition){
		if(typeof argDefinition.type !== "string"){
			return arg instanceof argDefinition.type;
		}else{
			return argDefinition.type === "*" || typeof arg === argDefinition.type || (arg && arg.constructor.name === argDefinition.type);
		}
	}

	function checkDefinition(args, definition, props, i, j){
		// reached the end
		if(j === definition.length){
			if(i !== args.length){
				// no definitons to match remaining arguments
				return undefined;
			}else{
				// we are done
				return true;
			}
		}

		var arg = args[i],
			argDefinition = definition[j];

		if(argDefinition.optional){
			if(checkArg(arg, argDefinition)){
				// recursively check all possibilities
				props[argDefinition.name] = arg;

				// assume this argument is included
				if(checkDefinition(args, definition, props, i + 1, j + 1)){
					return true;
				}

				// previous check failed
				delete props[argDefinition.name];
			}

			// assume this argument is not included
			if(checkDefinition(args, definition, props, i, j + 1)){
				// set argument to its default value
				props[argDefinition.name] = argDefinition.default;

				return true;
			}

			// all possibilities failed
			return false;
		}else{
			if(checkArg(arg, argDefinition)){
				props[argDefinition.name] = arg;

				// test next argument
				if(checkDefinition(args, definition, props, i + 1, j + 1)){
					return true;
				}

				// previous check failed
				delete props[argDefinition.name];
			}

			// failed
			return false;
		}
	}

	function generateInputSignature(args, format){
		var typeList = Array.prototype.map.call(args, function(arg){
			try{
				return arg.constructor.name || typeof arg;
			}catch(err){
				return typeof arg;
			}
		});

		return format.name + "(" + typeList.join(", ") + ")";
	}

	function generateDefinitionSignature(name, definition){
		return "\"" + name + "(" + definition.map(function(arg){
			var opt = [];

			if(arg.optional)	opt.push("optional");

			if(typeof arg.type === "string")	opt.push(arg.type);
			else                            	opt.push(arg.type.name);

			opt.push(arg.name);

			return opt.join(" ");
		}).join(", ") + ")\"";
	}

	function generateFormatSignature(format){
		if(format.definition){
			return generateDefinitionSignature(format.name, format.definition);
		}else if(format.definitions){
			var signatures = [];

			for(var definitionKey in format.definitions){
				signatures.push(generateDefinitionSignature(format.name, format.definitions[definitionKey]));
			}

			return signatures.join(" or ");
		}else{
			return "";
		}
	}

	function throwError(args, format){
		throw new Error("Form \"" + 
			generateInputSignature(args, format) + "\" does not match definition " + 
			generateFormatSignature(format));
	}

	/**
	 * ArgFormatter - normalize and categorize arguments
	 * 
	 * @param  {arguments} args            	Arguments to normalize
	 * @param  {object} format             	Describes definitons
	 * @param  {string} format.name        	Name of function
	 * @param  {array} [format.definiton]  	Array of paramters
	 * @param  {object} [format.definitons]	Object holding mulitple definitions
	 * @param  {boolean} throwUnmatchError 	True if it should automatically throw an error
	 * 
	 * @return {object}	normalized           	Normalized input
	 * @return {string}	normalized.definition	Matched definition name. "default" if not specified in format.definition
	 * @return {object}	normalized.arguments 	Object holding all arguments specified in the matched definition
	 */
	return function(args, format, throwUnmatchError){
		if(format.definitions){
			for(var definiitonKey in format.definitions){
				var definition = format.definitions[definiitonKey],
					props = {};

				if(checkDefinition(args, definition, props, 0, 0)){
					return {
						definition: definiitonKey,
						arguments: props
					};
				}
			}

			if(throwUnmatchError)	throwError(args, format);

			return {
				definition: null
			};
		}else if(format.definition){
			var props = {};

			if(checkDefinition(args, format.definition, props, 0, 0)){
				return {
					definition: "default",
					arguments: props
				};
			}

			if(throwUnmatchError)	throwError(args, format);

			return {
				definition: null
			};
		}

		throw "Either provide the \"definition\" or \"definitions\" property.";
	}
});