/**
 * @description	Simple dependency system
 * @author     	Derek Leung
 * @created    	2016-7-13
 * @updated    	2016-7-23
 *
 * @license MIT license
 *  
 */

(function(global){

	/**
	 * Parse arguments of a function
	 * @param  {Function} func Input function
	 * @return {Array}      List of argument names
	 *
	 * @license https://stackoverflow.com/questions/1007981 CC BY-SA 3.0
	 */
	function parseArgs(func){
		var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
		var ARGUMENT_NAMES = /([^\s,]+)/g;
		var fnStr = func.toString().replace(STRIP_COMMENTS, '');
		var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
		if(result === null)	result = [];

		return Array.prototype.slice.call(result);
	}

	/**
	 * @class Unique identifier object
	 */
	function UniqueIdentifier(description){
		this.description = description;
	}
	UniqueIdentifier.prototype = Object.create(null);

	/** Graph for performing topological sorts */
	function SimpleGraph(){
		this.nodes = Object.create(null);
	}

	function SimpleGraphNode(name, data){
		this.name = name;
		this.from = [];
		this.to = [];
		this.data = data;
	}

	SimpleGraph.prototype.addNode = function(node){
		this.nodes[node.name] = node;
	};

	SimpleGraph.prototype.addEdge = function(nodeStart, nodeEnd){
		nodeStart.to.push(nodeEnd);
		nodeEnd.from.push(nodeStart);
	};

	SimpleGraph.prototype.resetNodes = function(){
		this.nodes = Object.create(null);
	};

	// Topological sort with DFS
	SimpleGraph.prototype.topologicalSort = function(){
		var L = [];
		var unmarkedNodes = [],
			NOT_MARKED = 0,
			TEMPORARY = 1;

		// create list of unmarked nodes
		for(var nodeName in this.nodes){
			unmarkedNodes.push(this.nodes[nodeName]);
			this.nodes[nodeName].marked = NOT_MARKED;
		}

		while(unmarkedNodes.length){
			if(visit(unmarkedNodes[0])){
				return undefined;
			}
		}

		function visit(node){
			if(node.marked === TEMPORARY)	return true;
			if(node.marked === NOT_MARKED){
				node.marked = TEMPORARY;
				removeNode(node);
				for(var i = 0; i < node.to.length; i++){
					if(visit(node.to[i]))	return true;
				}
				delete node.marked;
				L.push(node);
			}
		}

		function removeNode(node){
			unmarkedNodes.splice(unmarkedNodes.indexOf(node), 1);
		}

		return L;
	};



	/**
	 * @namespace App
	 */
	var app = {
		/** 
		 * Enum for basic statuses.
		 * @readOnly
		 * @type {Object}
		 */
		Enums: {
			COMPONENT_NOT_EXIST: new UniqueIdentifier("Component not exist"),
			COMPONENT_INITIALIZING: new UniqueIdentifier("Component initializing"),
			COMPONENT_EXIST: new UniqueIdentifier("Component exists")
		},

		/** @type {Object} Storage for all components */
		storedComponents: Object.create(null),

		loadedComponents: [],

		/**
		 * Check if a component's name exist in storage.
		 * @param  {String} name Name to be checked
		 * @return {Boolean}      True if exists
		 */
		checkIfComponentExists: function(name){
			return app.getComponentStatus(name) === app.Enums.COMPONENT_EXIST;
		},

		/**
		 * Register a new component.
		 * @param  {String} name    Name of component
		 * @param  {Function} factory A function that returns an interface
		 * @return {*}         Returned value of factory
		 */
		registerComponent: function(name, factory){
			if(app.checkIfComponentExists(name)){
				throw new Error("Failed to register component. " + name + " already exists.");
			}

			console.group("Registering \"" + name + "\".");

			try{
				// safe execution
				var computedSingleton = app.depends(factory, name);
				// Store returned component interface
				app.storedComponents[name] = computedSingleton;
			}catch(err){
				console.groupEnd();
				throw err;
			}

			console.groupEnd();

			return computedSingleton;
		},

		/**
		 * Get a component.
		 * @param  {String} name Name of component
		 * @return {*}      Component interface, COMPONENT_NOT_EXIST if not exists
		 */
		getComponent: function(name){
			if(!app.checkIfComponentExists(name))	return app.Enums.COMPONENT_NOT_EXIST;
			else                                 	return app.storedComponents[name];
		},

		/**
		 * Injects dependencies to a function.
		 * @param  {Function} routine Function to inject
		 * @return {*}         Returned value of the exectution of the input function
		 */
		depends: function(routine, componentName){
			if(!(typeof routine === "function")){
				throw "Failed to inject dependencies into a non-function object.";
			}

			var dependencyList = parseArgs(routine);

			dependencyList.forEach(function(dependencyName, i){
				if(dependencyName === "__NAME__"){
					dependencyList[i] = componentName;
					return;
				}

				var dependency = app.getComponent(dependencyName);

				if(dependency === app.Enums.COMPONENT_NOT_EXIST){
					throw "Failed to inject dependency \"" + dependencyName + "\".";
				}else{
					dependencyList[i] = dependency;
				}
			});

			return routine.apply(global, dependencyList);
		},

		getComponentStatus: function(name){
			if(name === "__NAME__"){
				return app.Enums.COMPONENT_EXIST;
			}
			
			if(name in app.storedComponents){
				if(app.storedComponents[name] === app.Enums.COMPONENT_INITIALIZING){
					return app.Enums.COMPONENT_INITIALIZING;
				}else{
					return app.Enums.COMPONENT_EXIST;
				}
			}else{
				app.Enums.COMPONENT_NOT_EXIST;
			}
		}

	};

	/**
	 * Validate inputs for registerAll method.
	 * @param  {Arguments} args Arguemnts list
	 * @return {Boolean}      True if valid
	 */
	function validateRegisterAllSignature(args){
		// checks if length is even
		if(args.length % 2 === 1)	return false;

		// only checks even indices
		for(var i = 0; i < args.length; i += 2){
			if(typeof args[i] !== "string"){
				return false
			}
		}

		return true;
	}

	/**
	 * @module Components
	 */
	var exports = {
		enum: app.Enums,
		register: app.registerComponent,
		depends: app.depends,

		/**
		 * Shortcut for registering multiple components.
		 *
		 * @description
		 * Arguments format: (name, factory), ...
		 * This method is chosen to preserve input order.
		 */
		registerAll: function(){
			if(!validateRegisterAllSignature(arguments)){
				throw "Failed to register all functions. Invalid arguments.";
			}

			for(var i = 0; i < arguments.length; i += 2){
				app.registerComponent(arguments[i], arguments[i + 1]);
			}
		},

		getSingleton: function(name){
			return app.getComponent(name);
		},

		getRegisteredComponents: function(){
			return Object.keys(app.storedComponents);
		},

		loadComponentDefinition: function(name, factory){
			app.loadedComponents.push({name: name, factory: factory});
		},

		registerLoadedComponents: function(){
			// creates graph
			var graph = new SimpleGraph();

			// creates graph nodes for each loaded component
			app.loadedComponents.forEach(function(component){
				graph.addNode(new SimpleGraphNode(component.name, component.factory));
			});

			// creates edges for each dependencies
			app.loadedComponents.forEach(function(component){
				var dependencies = parseArgs(component.factory);
				var componentNode = graph.nodes[component.name];

				dependencies.forEach(function(dependency){
					var dependencyNode = graph.nodes[dependency];
					if(app.checkIfComponentExists(dependency)){
						return;
					}
					if(!dependencyNode){
						throw new Error("Component \"" + dependency + "\" does not exist.");
					}
					graph.addEdge(componentNode, dependencyNode);
				});
			});

			// get topological sort
			var sortedList = graph.topologicalSort();

			if(!sortedList){
				throw new Error("Circular dependency are not allowed.");
			}

			// register each components
			sortedList.forEach(function(node){
				exports.register(node.name, node.data);
			});

			// clear loaded components cache
			app.loadedComponents = [];
		},

		import: function(path, componentName, callback){
			callback = callback || function(){};

			switch(app.getComponentStatus(componentName)){
				case app.Enums.COMPONENT_INITIALIZING:
					// circular dependency
					callback({status: "failed", reasons: ["Failed to load \"" + componentName + "\": Circular dependencies"]});
					return;
				case app.Enums.COMPONENT_EXIST:
					// already loaded
					callback({status: "ok"});
					return;
			}

			// test if exports.define has actually been called after script was executed
			var componentDefineSucccess = false;

			// define temporary function for component registering
			exports.define = function(factory){
				app.storedComponents[componentName] = app.Enums.COMPONENT_INITIALIZING;
				componentDefineSucccess = true;
				delete exports.define;

				var dependencies = parseArgs(factory);

				exports.importList(path, dependencies, function(result){
					if(result.status === "failed"){
						delete app.storedComponents[componentName];
						callback({status: "failed", reasons: result.reasons});
					}else{
						registerComponent(factory);
					}
				});
			};

			function registerComponent(factory){
				try{
					app.registerComponent(componentName, factory);
					callback({status: "ok"});
				}catch(e){
					console.error(e);
					callback({status: "failed", reasons: ["Failed to register component \"" + componentName + "\" (" + e.message + ")"]});
				}
			}

			// load component
			var componentFile = document.createElement("script");
			componentFile.onload = componentFile.onerror = function(){
				if(!componentDefineSucccess){
					delete exports.define;
					callback({status: "failed", reasons: ["Failed to load component \"" + componentName + "\""]});
				}
			};
			componentFile.src = (path + "%s/%s.js").replace(/%s/g, componentName);
			document.getElementsByTagName("head")[0].appendChild(componentFile);
		},

		importList: function(path, componentNames, callback){
			if(!Array.isArray(componentNames)){
				throw new Error("importList requires a list of component names.");
			}

			callback = callback || function(){};

			var numComponents = componentNames.length,
				componentsLoadingFailedReasons = [];

			importComponent(0, function(){
				if(componentsLoadingFailedReasons.length){
					callback({status: "failed", reasons: componentsLoadingFailedReasons});
				}else{
					callback({status: "ok"});
				};
			});

			function importComponent(i, subCallback){
				if(i === numComponents){
					subCallback();	return;
				}
				exports.import(path, componentNames[i], function(result){
					if(result.status === "failed"){
						componentsLoadingFailedReasons = componentsLoadingFailedReasons.concat(result.reasons);
					}

					importComponent(i + 1, subCallback);
				});
			}
		}
	}

	// Keeps enums from being modified
	Object.freeze(exports.enum);
	
	global.Components = exports;

})(this);