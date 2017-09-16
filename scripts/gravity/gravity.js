/*************************************************************
 * This script is developed by Arturs Sosins aka ar2rsawseen, http://webcodingeasy.com
 * Feel free to distribute and modify code, but keep reference to its creator
 *
 * Gravity is a box2dweb wrapper for HTML elements. It provides a way to apply physics
 * to HTML elements, define gravity, handle collisions, apply different parameters as
 * friction, restitution, density and even drag physical HTML element bodies.
 *
 * For more information, examples and online documentation visit: 
 * http://webcodingeasy.com/JS-classes/Apply-physics-to-HTML-elements
**************************************************************/
var gravity = function(config){
	var   b2Vec2 = Box2D.Common.Math.b2Vec2
    ,   b2AABB = Box2D.Collision.b2AABB
    ,	b2BodyDef = Box2D.Dynamics.b2BodyDef
    ,	b2Body = Box2D.Dynamics.b2Body
    ,	b2FixtureDef = Box2D.Dynamics.b2FixtureDef
    ,	b2Fixture = Box2D.Dynamics.b2Fixture
    ,	b2World = Box2D.Dynamics.b2World
    ,	b2MassData = Box2D.Collision.Shapes.b2MassData
    ,	b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
    ,	b2CircleShape = Box2D.Collision.Shapes.b2CircleShape
    ,	b2DebugDraw = Box2D.Dynamics.b2DebugDraw
    ,  	b2MouseJointDef =  Box2D.Dynamics.Joints.b2MouseJointDef
	, 	b2Shape = Box2D.Collision.Shapes.b2Shape
	,	b2Math = Box2D.Common.Math.b2Math
	,	b2ContactListener = Box2D.Dynamics.b2ContactListener
    ;
	var R = 30;
	var conf = {
		xGravity: 0,
		yGravity: 9.8,
		onBeginCollision: null,
		onEndCollision: null,
		debugDraw: false,
		dragging: true,
		boundaries: "document"
	};
	var world, scroll, mouseX, mouseY, mousePVec, isMouseDown, selectedBody, mouseJoint, interval;
	var objects = [];
	var construct = function(){
		//copying configuration
		for(var opt in config){
			conf[opt] = config[opt];
		}
		scroll = get_scroll();
		add_event(window, "scroll", function(){
			scroll = get_scroll();
		});
		var d;
		
		if(conf.boundaries == "viewport")
		{
			d = viewport();
			d.x = 0;
			d.y = 0;
		}
		else if(conf.boundaries == "document")
		{
			d = doc_size();
			d.x = 0;
			d.y = 0;
		}
		else
		{
			var elem = (typeof conf.boundaries == "string") ? document.getElementById(conf.boundaries) : conf.boundaries;
			if(elem && elem.getBoundingClientRect)
			{
				d = {};
				var obl = elem.getBoundingClientRect();
				d.y = obl.top + scroll.y;
				d.x = obl.left + scroll.x;
				d.width = (obl.width) ? obl.width : (obl.left-obl.right);
				d.height = (obl.height) ? obl.height : (obl.top - obl.bottom);
			}
		}
		world = new b2World(new b2Vec2(conf.xGravity, conf.yGravity), true);
		if(conf.debugDraw && d)
		{
			//create canvas for debug draw
			var doc = doc_size();
			var canvas = document.createElement("canvas");
			canvas.setAttribute("width", doc.width + "px");
			canvas.setAttribute("height", doc.height + "px");
			canvas.style.position = "absolute";
			canvas.style.top = "0px";
			canvas.style.left = "0px";
			canvas.style.zIndex = -1;
            canvas.style.display = "none";
			document.body.appendChild(canvas);
			var debugDraw = new b2DebugDraw();
			debugDraw.SetSprite(canvas.getContext("2d"));
			debugDraw.SetDrawScale(R);
			debugDraw.SetFillAlpha(0.5);
			debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
			debugDraw.SetLineThickness(1.0);
			world.SetDebugDraw(debugDraw);
		}
		//if should be boundaries
		if(d)
		{
			var props = {
				fixed: true,
				restitution: 0.2,
				friction: 0.1,
				density: 1,
				includeChild: false
			};
			d.height = Math.round(d.height/2);
			d.width = Math.round(d.width/2);
			createBox(d.x, d.y + d.height, 1, d.height, "bound", props);
			createBox(d.x + d.width*2, d.y + d.height, 1, d.height, "bound", props);
			createBox(d.x + d.width, d.y, d.width, 1, "bound", props);
			createBox(d.x + d.width, d.y + d.height*2, d.width, 1, "bound", props);
		}
		
		if(conf.onBeginCollision || conf.onEndCollision)
		{
			var contact = new b2ContactListener();
			if(conf.onBeginCollision)
			{
				contact.BeginContact = function(contact){
					var ret = [];
					//loop through all contacts
					for (f = contact; f; f = f.GetNext()){
						//get fixture of colliding bodies
						var fixA = f.GetFixtureA();
						var fixB = f.GetFixtureB();
						//get colliding bodies
						var bodyA = fixA.GetBody();
						var bodyB = fixB.GetBody();
						//check colliding bodies (if not boudary)
						if((bodyA.GetUserData() && typeof bodyA.GetUserData().id != "undefined") &&
						(bodyB.GetUserData() && typeof bodyB.GetUserData().id != "undefined"))
						{
							var arr = [];
							if(bodyA.GetUserData().id == "bound")
							{
								arr.push(bodyA.GetUserData().id);
							}
							else
							{
								arr.push(objects[bodyA.GetUserData().id].elem);
							}
							if(bodyB.GetUserData().id == "bound")
							{
								arr.push(bodyB.GetUserData().id);
							}
							else
							{
								arr.push(objects[bodyB.GetUserData().id].elem);
							}
							ret.push(arr);
						}
					}
					if(ret != [])
					{
						conf.onBeginCollision(ret);
					}
				};
			}
			if(conf.onEndCollision)
			{
				contact.EndContact = function(contact){
					var ret = [];
					//loop through all contacts
					for (f = contact; f; f = f.GetNext()){
						//get fixture of colliding bodies
						var fixA = f.GetFixtureA();
						var fixB = f.GetFixtureB();
						//get colliding bodies
						var bodyA = fixA.GetBody();
						var bodyB = fixB.GetBody();
						//check colliding bodies (if not boudary)
						if((bodyA.GetUserData() && typeof bodyA.GetUserData().id != "undefined") &&
						(bodyB.GetUserData() && typeof bodyB.GetUserData().id != "undefined"))
						{
							var arr = [];
							if(bodyA.GetUserData().id == "bound")
							{
								arr.push(bodyA.GetUserData().id);
							}
							else
							{
								arr.push(objects[bodyA.GetUserData().id].elem);
							}
							if(bodyB.GetUserData().id == "bound")
							{
								arr.push(bodyB.GetUserData().id);
							}
							else
							{
								arr.push(objects[bodyB.GetUserData().id].elem);
							}
							ret.push(arr);
						}
					}
					if(ret != [])
					{
						conf.onEndCollision(ret);
					}
				};
			}
			world.SetContactListener(contact);
		}
		
		if(conf.dragging)
		{
			add_event(document, "mousedown", function(e) {
				//alert("me");
				isMouseDown = true;
				handleMouseMove(e);
				add_event(document, "mousemove", handleMouseMove);
			}, true);
         
			add_event(document, "mouseup", function() {
				rem_event(document, "mousemove", handleMouseMove);
				isMouseDown = false;
				mouseX = undefined;
				mouseY = undefined;
			}, true);
		}
	};
	
	this.load = function(){
		for(var i in objects)
		{
			if(objects[i].elem.style.position != "absolute")
			{
				objects[i].elem.style.position = "absolute";
				objects[i].elem.style.margin = "0";
				objects[i].elem.style.padding = "0";
				objects[i].elem.style.top = objects[i].bounds.top + "px";
				objects[i].elem.style.left = objects[i].bounds.left + "px";
				objects[i].elem.style.height = objects[i].bounds.height*2 + "px";
				objects[i].elem.style.width = objects[i].bounds.width*2 + "px";
			}
		}
		if(!interval)
		{
			interval = setInterval(update, 1000 / 60);
		}
	};
	
	this.add = function(elem, properties){
		var props = {
			fixed: false,
			restitution: 0.2,
			friction: 0.1,
			density: 1,
			includeChild: false
		};
		//copying configuration
		for(var opt in properties){
			props[opt] = properties[opt];
		}
		elem = (typeof elem == "string") ? document.getElementById(elem) : elem;
		if(elem)
		{
			if(props.includeChild)
			{
				check_child(elem, props);
			}
			else
			{
				pack(elem, props);
			}
		}
	};
	
	this.remove = function(elem){
		elem = (typeof elem == "string") ? document.getElementById(elem) : elem;
		var id = hasClass(elem);
		world.DestroyBody(objects[id].body);
		delete objects[id];
		removeClass(elem, "gravity_"+id);
	};

    this.removeByIndex = function(id) {
        world.DestroyBody(objects[id].body);
//        delete objects[id];
    }
	
	this.force = function(elem, xVect, yVect, x, y){
		elem = (typeof elem == "string") ? document.getElementById(elem) : elem;
		var id = hasClass(elem);
		if(id != null)
		{
			objects[id].body.SetAwake(true);
			var position;
			if(x == undefined || y == undefined)
			{
				position = objects[id].body.GetWorldCenter().Copy();
			}
			else
			{
				position = {x:x, y:y};
			}
			objects[id].body.ApplyForce(new b2Vec2(xVect, yVect), position);
		}
	};
	
	this.impulse = function(elem, xVect, yVect, x, y){
		elem = (typeof elem == "string") ? document.getElementById(elem) : elem;
		var id = hasClass(elem);
		if(id != null)
		{
			objects[id].body.SetAwake(true);
			var position;
			if(x == undefined || y == undefined)
			{
				position = objects[id].body.GetWorldCenter().Copy();
			}
			else
			{
				position = {x:x, y:y};
			}
			objects[id].body.ApplyImpulse(new b2Vec2(xVect, yVect), position);
		}
	};
	
	this.torque = function(elem, torque){
		elem = (typeof elem == "string") ? document.getElementById(elem) : elem;
		var id = hasClass(elem);
		objects[id].body.SetAwake(true);
		objects[id].body.ApplyTorque(torque);
	};
	
	this.hasBody = function(elem){
		elem = (typeof elem == "string") ? document.getElementById(elem) : elem;
		return hasClass(elem) != null;
	};
	
	//check for children
	var check_child = function(el, props){
		var hasChildElements = false;
		for (var child = el.firstChild; child; child = child.nextSibling){
			if (child.nodeType == 1) {
				hasChildElements = true;
				if(!check_child(child, props))
				{
					pack(child, props);
				}
			}
		}
		return hasChildElements;
	};
	
	var pack = function(elem, props){
		var obl = elem.getBoundingClientRect();
		var bounds = {};
		bounds.top = obl.top + scroll.y;
		bounds.bottom = obl.bottom + scroll.y;
		bounds.left = obl.left + scroll.x;
		bounds.right = obl.right + scroll.x;
		bounds.width = (obl.width) ? obl.width/2 : (obl.left-obl.right)/2;
		bounds.height = (obl.height) ? obl.height/2 : (obl.top - obl.bottom)/2;
		var ob = {};
		ob.elem = elem;
		ob.bounds = bounds;
		ob.startY = bounds.height;
		ob.startX = bounds.width;
		ob.body = createBox(bounds.left + bounds.width, bounds.top + bounds.height, bounds.width, bounds.height, objects.length, props);
		addClass(elem, "gravity_" + objects.length);
		objects.push(ob);
	};
	
	var createBox = function(x, y, width, height, id, props) {
		//defining fixture
		var fixDef = new b2FixtureDef;
		fixDef.restitution = props.restitution;
		fixDef.friction = props.friction;
		fixDef.density = props.density;
		//define shape
		fixDef.shape = new b2PolygonShape;
		//define size with scaling
		fixDef.shape.SetAsBox(width/R, height/R);
		
		//defining body
		var bodyDef = new b2BodyDef;
		//fixed or moving
		if(props.fixed){
			bodyDef.type = b2Body.b2_staticBody;
		}
		else{ 
			bodyDef.type = b2Body.b2_dynamicBody;
		}
		//position where to place it
		bodyDef.position.Set(x/R,y/R);
			
		var body = world.CreateBody(bodyDef);
		body.CreateFixture(fixDef);
		body.SetUserData({id:id});
		return body;
	};
	
	var Draw = function(){
		//get list of bodies in world
		var list = world.GetBodyList();
		//iterate trhough bodies
		for (body = list; body; body = body.GetNext()){
			if(body.GetUserData() && typeof body.GetUserData().id != "undefined")
			{
				//get body's transformation
				var transform = body.GetTransform();
				//iterate through al body's fixtures
				for (f = body.GetFixtureList(); f; f = f.GetNext()) {
					//draw shapes of fixtures
					DrawShape(f.GetShape(), transform, body.GetUserData().id);
				}
			}
		}
	};
	
	var DrawShape = function(shape, xf, id){
		//determine type of shape
		switch (shape.GetType()) {
			//if poly shape including box
			case b2Shape.e_polygonShape:
			{
				if(objects[id])
				{
					var position = objects[id].body.GetWorldCenter().Copy();
					rotate = xf.GetAngle();
					objects[id].elem.style.MsTransform = "rotate(" + rotate + "rad)";
					objects[id].elem.style.MozTransform = "rotate(" + rotate + "rad)";
					objects[id].elem.style.WebkitTransform = "rotate(" + rotate + "rad)";
					objects[id].elem.style.OTransform = "rotate(" + rotate + "rad)";
					objects[id].elem.style.transform = "rotate(" + rotate + "rad)";
					objects[id].elem.style.filter = "progid:DXImageTransform.Microsoft.Matrix(sizingMethod='auto expand', M11='" + Math.cos(rotate) + "', M12='"+ (-Math.sin(rotate)) + "', M21='" + Math.sin(rotate) + "', M22='" + Math.cos(rotate) + "');";
					objects[id].elem.style.Msfilter = "progid:DXImageTransform.Microsoft.Matrix(sizingMethod='auto expand', M11='" + Math.cos(rotate) + ", M12='"+ (-Math.sin(rotate)) + "', M21='" + Math.sin(rotate) + "', M22='" + Math.cos(rotate) + "');";
					objects[id].elem.style.top = ((position.y * R)-objects[id].startY) + "px";
					objects[id].elem.style.left = ((position.x * R)-objects[id].startX) + "px";
				}
			}
			break;
		}
	};
	
	var hasClass = function(ele) {
		var reg = new RegExp('\s*gravity_(.*)\s*');
		var res = reg.exec(ele.className);
		if(res != null)
		{
			return res[1];
		}
		else
		{
			return null;
		}
	};
	
	var addClass = function(ele,cls) {
		ele.className += " "+cls;
	};
	
	var removeClass = function(ele,cls) {
        if (hasClass(ele,cls) != null) {
            var reg = new RegExp('(\\s|^)'+cls+'(\\s|$)');
            ele.className=ele.className.replace(reg,' ');
        }
    };
	
	var update = function() {
		if(conf.dragging)
		{
			if(isMouseDown && (!mouseJoint)) {
               var body = getBodyAtMouse();
               if(body) {
                  var md = new b2MouseJointDef();
                  md.bodyA = world.GetGroundBody();
                  md.bodyB = body;
                  md.target.Set(mouseX, mouseY);
                  md.collideConnected = true;
                  md.maxForce = 300.0 * body.GetMass();
                  mouseJoint = world.CreateJoint(md);
                  body.SetAwake(true);
               }
            }
            
            if(mouseJoint) {
               if(isMouseDown) {
                  mouseJoint.SetTarget(new b2Vec2(mouseX, mouseY));
               } else {
                  world.DestroyJoint(mouseJoint);
                  mouseJoint = null;
               }
            }
		}
		Draw();
		world.Step(1 / 60, 10, 10);
		if(conf.debugDraw)
		{
			world.DrawDebugData();
		}
		world.ClearForces();
	};
         
	var handleMouseMove = function(e) {
		e = get_page_coord(e);
		mouseX = e.pageX/R;
		mouseY = e.pageY/R;
	};
         
	var getBodyAtMouse = function() {
		mousePVec = new b2Vec2(mouseX, mouseY);
		var aabb = new b2AABB();
		aabb.lowerBound.Set(mouseX - 0.001, mouseY - 0.001);
		aabb.upperBound.Set(mouseX + 0.001, mouseY + 0.001);
		
		// Query the world for overlapping shapes.

		selectedBody = null;
		world.QueryAABB(getBodyCB, aabb);
		return selectedBody;
	};

	var getBodyCB = function(fixture) {
		if(fixture.GetBody().GetType() != b2Body.b2_staticBody) {
			if(fixture.GetShape().TestPoint(fixture.GetBody().GetTransform(), mousePVec)) {
				selectedBody = fixture.GetBody();
				return false;
			}
		}
		return true;
	};
	
	//get document dimensions
	var doc_size = function(){
		var docsize = new Object();
		docsize.width = 0;
		docsize.height = 0;
		docsize.width = Math.max(
			Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
			Math.max(document.body.offsetWidth, document.documentElement.offsetWidth),
			Math.max(document.body.clientWidth, document.documentElement.clientWidth)
		);
		docsize.height = Math.max(
			Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
			Math.max(document.body.offsetHeight, document.documentElement.offsetHeight),
			Math.max(document.body.clientHeight, document.documentElement.clientHeight)
		);
		return docsize;
	};
	
	//get viewport dimensions
	var viewport = function(){
		var viewport = new Object();
		viewport.width = 0;
		viewport.height = 0;
		// the more standards compliant browsers (mozilla/netscape/opera/IE7) 
		//use window.innerWidth and window.innerHeight
		if (typeof window.innerWidth != 'undefined')
		{
			viewport.width = window.innerWidth,
			viewport.height = window.innerHeight
		}
		else if (typeof document.documentElement != 'undefined'
		&& typeof document.documentElement.clientWidth !=
		'undefined' && document.documentElement.clientWidth != 0)
		{
			viewport.width = document.documentElement.clientWidth,
			viewport.height = document.documentElement.clientHeight
		}
		else
		{
			viewport.width = document.getElementsByTagName('body')[0].clientWidth,
			viewport.height = document.getElementsByTagName('body')[0].clientHeight
		}
		return viewport;
	};
	
	// scroll position
	var get_scroll = function(){
		var x = 0, y = 0;
		if( typeof( window.pageYOffset ) == 'number' ) {
			//Netscape compliant
			y = window.pageYOffset;
			x = window.pageXOffset;
		} else if( document.body && ( document.body.scrollLeft || document.body.scrollTop ) ) {
			//DOM compliant
			y = document.body.scrollTop;
			x = document.body.scrollLeft;
		} else if( document.documentElement && 
		( document.documentElement.scrollLeft || document.documentElement.scrollTop ) ) {
			//IE6 standards compliant mode
			y = document.documentElement.scrollTop;
			x = document.documentElement.scrollLeft;
		}
		var obj = new Object();
		obj.x = x;
		obj.y = y;
		return obj;
	};
	
	var get_page_coord = function(e){
		//checking if pageY and pageX is already available
		if (typeof e.pageY == 'undefined' &&  
			typeof e.clientX == 'number' && 
			document.documentElement)
		{
			//if not, then add scrolling positions
			e.pageX = e.clientX + document.body.scrollLeft
				+ document.documentElement.scrollLeft;
			e.pageY = e.clientY + document.body.scrollTop
				+ document.documentElement.scrollTop;
		};
		//return e which now contains pageX and pageY attributes
		return e;
	};
	//add event
	var add_event = function(element, type, listener){
		if(element.addEventListener)
		{
			element.addEventListener(type, listener, false);
		}
		else
		{
			element.attachEvent('on' +  type, listener);
		}
	};
	//remove event
	var rem_event = function(element, type, listener){
		if(element.removeEventListener)
			element.removeEventListener(type, listener, false);
		else
			element.detachEvent('on' +  type, listener);
	};
	
	construct();
}