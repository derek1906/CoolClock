/**
 * Graphics.js
 *
 * Renders entities on 2d canvas.
 *
 * Supports screens with different pixel ratio.
 * Entities are cached to avoid unnecessary redraws.
 */

Components.define(function(argFormatter, log){

	function inherit(child, parent){
		child.prototype = Object.create(parent.prototype);
		child.prototype.constructor = child;
	}

	function applyDefault(preset, input){
		for(var key in input){
			preset[key] = input[key];
		}
		return preset;
	}

	function getPixelRatio(){
		// pixel ratio has to be at least 1
		return Math.max(Math.floor(window.devicePixelRatio), 1);
	}


	/** Abstract classes */

	/**
	 * Entity - Default class
	 */
	function Entity(x, y){
		this.set({
			x: x, y: y,
			_requireRerender: true,
			hidden: false,
			descriptors: [],
			parent: null
		});
	}
	/** Set properties */
	Entity.prototype.set = function(){
		var input = argFormatter(arguments, {
			name: "Entity.set",
			definitions: {
				"single": [{name: "key", type: "string"}, {name: "value", type: "*"}],
				"multiple": [{name: "properties", type: "object"}]
			}
		}, true), args = input.arguments;

		switch(input.definition){
			case "single":
				this[args.key] = args.value; break;
			case "multiple":
				for(var key in args.properties){
					this[key] = args.properties[key];
				}
				break;
		}

		this._requireRerender = true;
	};
	/** Default entity core rendering */
	Entity.prototype._render = function(ctx){};
	/** Default entity rendering */
	Entity.prototype.render = function(w, h){
		// hidden
		if(this.hidden)	return this.getClearCanvas(w, h);
		// does not require re-rendering
		if(!this.isRerenderRequired(w, h))	return this._cache;

		// get clean canvas for drawing
		var self = this, rendered = this.getClearCanvas(w, h), ctx = rendered.getContext("2d");

		// link descriptors
		var applyDescriptors = this.descriptors.reduce(function(prev, current){
			return function(){
				current(ctx, prev, self);
			};
		}, function(){
			self._render(ctx);
		});
	
		// apply descriptors to entity rendering
		ctx.save();
		applyDescriptors();
		ctx.restore();

		this._requireRerender = false;

		return rendered;
	};
	/** Get a clear canvas */
	Entity.prototype.getClearCanvas = function(w, h){
		var pixelRatio = getPixelRatio(),
			expandedWidth = w * pixelRatio,
			expandedHeight = h * pixelRatio;

		// creates a new canvas if cache does not exist or dimensions do not match
		if(!this._cache || this._cache.width !== expandedWidth || this._cache.height !== expandedHeight){
			this._cache = document.createElement("canvas");
			this._cache.width = expandedWidth;
			this._cache.height = expandedHeight;
			this._cache.getContext("2d").scale(pixelRatio, pixelRatio);
		}
		var canvas = this._cache, ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, w, h);

		return canvas;
	};
	/** Default test if re-render is needed */
	Entity.prototype.isRerenderRequired = function(w, h){
		var self = this;
		function isSizeChanged(){
			var pixelRatio = getPixelRatio();

			if(self._cache){
				return self._cache.width !== w * pixelRatio || self._cache.height !== h * pixelRatio;
			}else{
				return true;
			}
		}

		return this._requireRerender || isSizeChanged();
	};
	Entity.prototype.toString = function(){
		return "[object Graphics." + this.constructor.name + "]";
	};


	/**
	 * Containable - Default class for entities that can contain
	 * other entities.
	 *
	 * This class implements `getBoundaryPath` and `add`.
	 * 
	 * getBoundaryPath - For getting a path for clipping during
	 *	the rendering of its children.
	 * add             - For adding children
	 */
	function Containable(x, y){
		Entity.call(this, x, y);
		this.set({
			"children": [],
			"clipping": true,
			"relativeDrawing": true
		});
	}
	inherit(Containable, Entity);
	/** Overrides Entity's default rendering to handle children */
	Containable.prototype.render = function(w, h){
		var needRerender = this.isRerenderRequired(w, h),
			rendered = Entity.prototype.render.call(this, w, h),
			renderedCtx = rendered.getContext("2d"),
			self = this;

		// apply children renders if needs re-render and not hidden
		if(this.children.length && needRerender && !this.hidden){
			renderedCtx.save();

			// set up clipping
			if(this.clipping){
				this.getBoundaryPath(renderedCtx);
				renderedCtx.clip();
			}

			// content always go to the top
			renderedCtx.globalCompositeOperation = "source-over";

			// draw children content
			var pixelRatio = getPixelRatio();
			this.children.forEach(function(child){
				var childRendered = child.render(w, h);
				renderedCtx.save();
				if(self.relativeDrawing)	renderedCtx.translate(self.x, self.y);
				renderedCtx.drawImage(childRendered, 0, 0, childRendered.width / pixelRatio, childRendered.height / pixelRatio);
				renderedCtx.restore();
			});

			renderedCtx.restore();
		}


		return rendered;
	};
	/** Default getBoundaryPath */
	Containable.prototype.getBoundaryPath = function(ctx){
		ctx.beginPath();
		ctx.closePath();
	};
	/** Add an entity to the containable chlidren list */
	Containable.prototype.add = function(){
		var input = argFormatter(arguments, {
			name: "Containable.add",
			definitions: {
				"single": [{name: "entity", type: Entity}],
				"list": [{name: "entities", type: "Array"}]
			}
		}, true), args = input.arguments;

		switch(input.definition){
			case "single":
				this.children.push(args.entity);
				if(args.entity.parent && args.entity.parent !== this){
					// move to current Containable
					args.entity.parent.remove(args.entity);
				}
				args.entity.parent = this;
				break;
			case "list":
				this.children = this.children.concat(args.entities);
				args.entities.forEach(child => {
					if(child.parent && args.entity.parent !== this){
						// move to current Containable
						child.parent.remove(child);
					}
					child.parent = this;
				});
				break;
		}
	};
	Containable.prototype.remove = function(child){
		argFormatter(arguments, {
			name: "Containable.remove",
			definition: [{name: "entity", type: Entity}]
		}, true);

		var index = this.children.indexOf(child);

		if(index > -1)	this.children.splice(index, 1);
	}
	Containable.prototype.removeAll = function(){
		this.children = [];
	}
	/** @override */
	Containable.prototype.isRerenderRequired = function(w, h){
		if(Entity.prototype.isRerenderRequired.call(this, w, h)){
			this._requireRerender = true;
		}else if(this.children.length){
			var childrenNeedRerender = this.children.reduce(function(prev, current){
				return prev || current.isRerenderRequired(w, h);
			}, this.children[0].isRerenderRequired(w, h));

			if(childrenNeedRerender)	this._requireRerender = true;
		}

		return this._requireRerender;
	};
	Containable.prototype.getEntityById = function(id){
		argFormatter(arguments, {
			name: "Containable.getEntityById",
			definition: [{name: "id", type: "string"}]
		}, true);

		var current, queue = [this];
		// BFS
		while(queue.length){
			current = queue.shift();
			if(current.id === id)	return current;
			if(current.children) 	queue = queue.concat(current.children);
		}

		return undefined;
	}


	/** Nondrawables (does not implement `_render`) */

	/** Bounding box */
	function Transformable(x, y, width, height){
		Containable.call(this);

		this.set({
			x: x,
			y: y,
			width: width,
			height: height,
			transform: {
				origin: {x: 0, y: 0},
				properties: {
					rotate: 0,
					translate: {dx: 0, dy: 0},
					scale: {x: 1, y: 1}
				}
			}
		});
	}
	inherit(Transformable, Containable);
	/** @override */
	Transformable.prototype.getBoundaryPath = function(ctx){
		ctx.beginPath();
		ctx.rect(this.x, this.y, this.width, this.height);
		ctx.closePath();
	};
	/** @override */
	Transformable.prototype.render = function(w, h){
		if(!this.isRerenderRequired(w, h))	return this._cache;

		// get clean canvas for drawing
		var rendered = this.getClearCanvas(w, h), ctx = rendered.getContext("2d");

		ctx.save();

		ctx.translate(this.transform.origin.x + this.x, this.transform.origin.y + this.y);

		// apply rotation
		ctx.rotate(this.transform.properties.rotate);
		// apply translation
		ctx.translate(this.transform.properties.translate.dx, this.transform.properties.translate.dy);
		// apply scale
		ctx.scale(this.transform.properties.scale.x, this.transform.properties.scale.y);

		ctx.translate(-this.transform.origin.x - this.x, -this.transform.origin.y - this.y);


		Containable.prototype.render.call(this, w, h);

		ctx.restore();

		return rendered;
	};
	Transformable.prototype.setTransform = function(){
		var input = argFormatter(arguments, {
			name: "Transformable.setTransform",
			definitions: {
				"single": [{name: "method", type: "string"}, {name: "value", type: "*"}],
				"multiple": [{name: "properties", type: "object"}]
			}
		}, true), args = input.arguments;

		switch(input.definition){
			case "single":
				this.transform.properties[args.method] = args.value;
				break;
			case "multiple":
				for(var method in args.properties){
					this.transform.properties[method] = args.properties[method];
				}
				break;
		}
		
		this._requireRerender = true;
	};
	Transformable.prototype.setTransformOrigin = function(x, y){
		argFormatter(arguments, {
			name: "Box.setTransformOrigin",
			definition: [{name: "x", type: "number"}, {name: "y", type: "number"}]
		}, true);

		this.transform.origin = {x: x, y: y};
		this._requireRerender = true;
	};


	/**
	 * Diagonal shadow container
	 * Generates a diagonal shadow of its content.
	 * Note: Computational expensive.
	 */
	function DiagonalShadowContainer(parent, width, height){
		argFormatter(arguments, {
			name: "DiagonalShadowContainer",
			definition: [{name: "parent", type: Containable}, {name: "width", type: "number"}, {name: "height", type: "number"}]
		}, true);
		Transformable.call(this, 0, 0, width, height);
		this.set("parent", parent);
	}
	inherit(DiagonalShadowContainer, Transformable);
	DiagonalShadowContainer.prototype.render = function(w, h){
		w = this.width; h = this.height;
		var rendered = Transformable.prototype.render.call(this, w, h),
			renderedCtx = rendered.getContext("2d");

		// Unoptimized
		/*
		function getIndex(x, y){
			return (y * width + x) * 4;
		}

		function isClear(x, y){
			var index = getIndex(x, y);
			return data[index + 3] === 0;
		}

		function isInShadow(x, y){
			if(x < 1 || y < 1)                         	return false;
			if(isClear(x, y) && !isClear(x - 1, y - 1))	return true;

			return false;
		}

		var width = rendered.width, height = rendered.height,
			imgData = renderedCtx.getImageData(0, 0, width, height),
			data = imgData.data;

		for(var y = 0; y < height; y++){
			for(var x = 0; x < width; x++){
				if(isInShadow(x, y)){
					data[getIndex(x, y) + 3] = 256 * 0.1;
				}
			}
		}
		*/
	
		// Optimized code - refer to previous comment block
		var width = rendered.width, height = rendered.height,
			imgData = renderedCtx.getImageData(0, 0, width, height),
	        data = new Uint8Array(imgData.data.buffer),
	        arrayWidth = width * 4, arrayHeight = height * 4;

	    for(var y = 0; y < arrayHeight; y+=4){
			for(var x = 0; x < arrayWidth; x+=4){
	            if(x > 0 && y > 0 && !data[y * width + x + 3] && data[(y - 4) * width + x - 1]){
	                data[y * width + x + 3] = 25;
	            }
	        }
	    }

		renderedCtx.putImageData(imgData, 0, 0);

		return rendered;
	};


	/** Viewport */
	function Viewport(width, height){
		Transformable.call(this, 0, 0, width, height);
	}
	inherit(Viewport, Transformable);
	/** @override */
	Viewport.prototype.render = function(){
		var rendered = Transformable.prototype.render.call(this, this.width, this.height);
		return rendered;
	};
	/** @override */
	Viewport.prototype.getBoundaryPath = function(ctx){
		ctx.beginPath();
		ctx.rect(0, 0, this.width, this.height);
		ctx.closePath();
	};


	/** Drawables */

	/** Generic line */
	function Line(){
		var input = argFormatter(arguments, {
			name: "Line",
			definition: [
				{name: "x", type: "number"},
				{name: "y", type: "number"},
				{name: "dx", type: "number"},
				{name: "dy", type: "number"},
				{name: "width", type: "number", optional: true, default: 1},
				{name: "color", type: "string", optional: true, default: "black"}
			]
		}, true), args = input.arguments;

		Entity.call(this);

		this.set({
			x: args.x,
			y: args.y,
			dx: args.dx,
			dy: args.dy,
			width: args.width,
			color: args.color,

			children: []
		});
	}
	inherit(Line, Entity);
	/** @override */
	Line.prototype._render = function(ctx){
		ctx.beginPath();
		ctx.moveTo(this.x, this.y);
		ctx.lineTo(this.x + this.dx, this.y + this.dy);
		ctx.stroke();
		ctx.closePath();
	};


	/** Generic text */
	function Text(){
		var input = argFormatter(arguments, {
			name: "Text",
			definition: [
				{name: "x", type: "number"},
				{name: "y", type: "number"},
				{name: "text", type: "string"}
			]
		}, true), args = input.arguments;

		Entity.call(this);

		this.set({
			x: args.x,
			y: args.y,
			text: args.text
		});
	}
	inherit(Text, Entity);
	/** @override */
	Text.prototype._render = function(ctx){
		ctx.fillText(this.text, this.x, this.y);
	};
	Text.prototype.getWidth = function(){
		var ctx = this.getClearCanvas(0, 0).getContext("2d"),
			width = 0,
			self = this;

		var applyDescriptors = this.descriptors.reduce(function(prev, current){
			return function(){
				current(ctx, prev, self);
			};
		}, function(){
			width = ctx.measureText(self.text).width;
		});

		ctx.save();
		applyDescriptors();
		ctx.restore();

		return width;
	}


	/** Generic circle */
	function Circle(){
		var input = argFormatter(arguments, {
			name: "Circle",
			definition: [
				{name: "centerX", type: "number"},
				{name: "centerY", type: "number"},
				{name: "radius", type: "number"}
			]
		}, true), args = input.arguments;

		this.set({
			centerX: args.centerX,
			centerY: args.centerY,
			radius: args.radius
		});

		Transformable.call(this, 
			this.centerX - this.radius, this.centerY - this.radius, 
			this.radius * 2, this.radius * 2);
	}
	inherit(Circle, Transformable);
	/** @override */
	Circle.prototype._render = function(ctx){
		this.getBoundaryPath(ctx);
		ctx.fill();
		ctx.stroke();
	};
	/** @override */
	Circle.prototype.getBoundaryPath = function(ctx){
		ctx.beginPath();
		ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
		ctx.closePath();
	};


	/** Generic rectangle with rounded corners */
	function Rect(){
		var input = argFormatter(arguments, {
			name: "Rect",
			definition: [
				{name: "x", type: "number"},
				{name: "y", type: "number"},
				{name: "width", type: "number"},
				{name: "height", type: "number"},
				{name: "cornerRadius", type: "number", optional: true, default: 0}
			]
		}, true), args = input.arguments;

		Transformable.call(this, args.x, args.y, args.width, args.height);

		this.set("cornerRadius", args.cornerRadius);
	}
	inherit(Rect, Transformable);
	/** @override */
	Rect.prototype._render = function(ctx){
		this.getBoundaryPath(ctx);
		ctx.fill();
		ctx.stroke();
	}
	/** @override */
	Rect.prototype.getBoundaryPath = function(ctx){
		ctx.beginPath();
		if(this.cornerRadius > 0){
			// rect with rounded corners
			ctx.moveTo(this.x + this.cornerRadius, this.y);
			ctx.arcTo(this.x + this.width,	this.y,              	this.x + this.width,	this.y + this.height,	this.cornerRadius);
			ctx.arcTo(this.x + this.width,	this.y + this.height,	this.x,             	this.y + this.height,	this.cornerRadius);
			ctx.arcTo(this.x,             	this.y + this.height,	this.x,             	this.y,              	this.cornerRadius);
			ctx.arcTo(this.x,             	this.y,              	this.x + this.width,	this.y,              	this.cornerRadius);
		}else{
			// draw a normal rect
			ctx.rect(this.x, this.y, this.width, this.height);
		}
		ctx.closePath();
	};


	/** Combing different Text in one line */
	function Sentence(){
		var input = argFormatter(arguments, {
			name: "Sentence",
			definition: [
				{name: "x", type: "number"},
				{name: "y", type: "number"},
				{name: "alignmentProperties", type: "object", optional: true, default: {}}
			]
		}, true), args = input.arguments;

		Containable.call(this, args.x, args.y);

		alignmentProperties = applyDefault({
			align: "left",
			baseline: "baseline"
		}, args.alignmentProperties);


		this.set({
			"alignmentProperties": alignmentProperties,
			"clipping": false,
			"relativeDrawing": false
		});
	}
	inherit(Sentence, Containable);
	/** @override */
	Sentence.prototype.add = function(){
		throw new Error("Sentence does not allow manual entities adding.");
	};
	/** Set text to display */
	Sentence.prototype.setText = function(textFragments){
		argFormatter(arguments, {
			name: "Sentence.setText",
			definition: [{name: "textFragments", type: "Array"}]
		}, true);

		// clear storage
		this.removeAll();

		var self = this;
		var totalWidth = 0;
		var fragments = textFragments.map(function(fragment){
			// create new text entity
			var textEntity = new Text(0, 0, fragment.text);
			textEntity.descriptors = [app.Descriptors.textStyle({
				fontSize: fragment.fontSize,
				fontFamily: fragment.fontFamily,
				color: fragment.color,
				align: "left",                             	// align left
				baseline: this.alignmentProperties.baseline	// common baseline
			})].concat(fragment.descriptors || []);
			var width = textEntity.getWidth();

			totalWidth += width;

			// add text entity
			Containable.prototype.add.call(self, textEntity);

			return {
				entity: textEntity,
				width: width
			};
		});

		// calculate left most x
		var leftMostX;
		switch(this.alignmentProperties.align){
			case "center":
				leftMostX = -totalWidth / 2; break;
			case "right":
				leftMostX = -totalWidth; break;
			case "left":
			default:
				leftMostX = 0; break;
		}

		// calculate coordinates for all text entities
		fragments.reduce(function(x, fragment){
			fragment.entity.set({
				"x": x,
				"y": self.y
			});
			return x + fragment.width;
		}, leftMostX + this.x);
	};


	var app = {
		Descriptors: {
			stroke: function(){
				var input = argFormatter(arguments, {
					name: "Descriptors.stroke",
					definition: [
						{name: "width", type: "number", optional: true, default: 1}, 
						{name: "color", type: "string", optional: true, default: "black"}
					]
				}, true), args = input.arguments;

				// by default zero width is ignored by the Canvas API
				if(args.width === 0)	args.color = "transparent";

				return function stroke(ctx, renderer){
					ctx.save();
					ctx.lineWidth = args.width;
					ctx.strokeStyle = args.color;
					renderer();
					ctx.restore();
				};
			},
			fill: function(){
				var input = argFormatter(arguments, {
					name: "Descriptors.fill",
					definition: [
						{name: "color", type: "string", optional: true, default: "transparent"}
					]
				}, true), args = input.arguments;

				return function fill(ctx, renderer){
					ctx.save();
					ctx.fillStyle = args.color;
					renderer();
					ctx.restore();
				};
			},
			shadow: function(){
				var input = argFormatter(arguments, {
					name: "Descriptors.shadow",
					definition: [
						{name: "offsetX", type: "number"},
						{name: "offsetY", type: "number"},
						{name: "color", type: "string", optional: true, default: "black"},
						{name: "blur", type: "number", optional: true, default: 0}
					]
				}, true), args = input.arguments;

				return function shadow(ctx, renderer){
					ctx.save();
					ctx.shadowOffsetX = args.offsetX;
					ctx.shadowOffsetY = args.offsetY;
					ctx.shadowColor = args.color;
					ctx.shadowBlur = args.blur;
					renderer();
					ctx.restore();
				};
			},
			textStyle: function(properties){
				var input = argFormatter(arguments, {
					name: "Descriptors.textStyle",
					definition: [
						{name: "properties", type: "object"}
					]
				}, true)

				var props = applyDefault({
					fontSize: 12,
					fontFamily: "Arial",
					color: "black",
					align: "left",
					baseline: "top"
				}, properties);

				return function textStyle(ctx, renderer, entity){
					ctx.save();
					ctx.fillStyle = props.color;
					ctx.font = props.fontSize + "px " + props.fontFamily;
					ctx.textAlign = props.align;
					ctx.textBaseline = props.baseline;
					renderer();
					ctx.restore();
				};
			}
		},
		Containers: {
			Sentence: Sentence,
			Shadow: DiagonalShadowContainer,
			Transformable: Transformable,
			Viewport: Viewport
		},
		Shapes: {
			Circle: Circle,
			Line: Line,
			Rect: Rect,
			Text: Text
		},

		// methods
		create: function(width, height, canvasOnly){
			var input = argFormatter(arguments, {
				name: "Graphics.create",
				definition: [
					{name: "width", type: "number"},
					{name: "height", type: "number"},
					{name: "canvasOnly", type: "boolean", optional: true, default: false}
				]
			}, true), args = input.arguments;

			if(args.canvasOnly){
				var canvas = document.createElement("canvas"),
					pixelRatio = getPixelRatio();
				canvas.width = args.width * pixelRatio;
				canvas.height = args.height * pixelRatio;
				canvas.getContext("2d").scale(pixelRatio, pixelRatio);
				return canvas;
			}else{
				return new Viewport(width, height);
			}
		}
	};

	return app;
});