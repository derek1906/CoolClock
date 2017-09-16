Components.importList("/components/", ["Graphics", "GraphicsPresets"], function(){
	Components.depends(function(Graphics, GraphicsPresets){
		var data = {
			width: 128,
			height: 128,
			strokeWidth: 4,
			minY: 0.1,
			hrY: 0.3,
			minColor: "gray",
			hrColor: "gray",
			flatTip: false,
			circleBorder: false,
			circleBorderWidth: 1,
			circleBorderColor: "#6E6E6E",
			background: "transparent",
			clockBg: "transparent",
			indicationLines: false,
			notificationBg: false,
		};

		var desc = Graphics.Descriptors, noStroke = desc.stroke(0), noFill = desc.fill();
	
		var analogClock = GraphicsPresets.create("analog-clock", data);

		var currentTime = new Date();
		var t = 0;
		function render(newT){
			requestAnimationFrame(render);

			var dt = newT - t;
			fps.set("text", "FPS: " + (1000/dt).toFixed());
			t = newT;

			analogClock.setTime(currentTime);

			var hrAngle = ((currentTime.getHours() % 12) / 12 + currentTime.getMinutes() / 60 / 12 + currentTime.getSeconds() / 60 / 60 / 12) * Math.PI * 2;

			box.setTransform({
				scale: {x: 1/hrAngle, y: 1/hrAngle},
				rotate: hrAngle
			});

			return viewport.render();
		}

		var winWidth = window.innerWidth, winHeight = window.innerHeight;
		var viewport = Graphics.create(winWidth, winHeight);
		var box = new Graphics.Shapes.Rect(winWidth/2 - data.width/2, winHeight/2 - data.height/2, data.width, data.height, 15);
		var shadow = new Graphics.Containers.Shadow(box, box.width, box.height);
		var cap = new Graphics.Shapes.Circle(data.width / 2, data.height / 2, 5);
		box.descriptors = [desc.fill("#EEE"), noStroke];
		cap.descriptors = [desc.fill("#555"), noStroke];
		viewport.add(box);
		box.add(shadow);
		shadow.add(analogClock.getEntity());
		shadow.add(cap);

		var fps = new Graphics.Shapes.Text(0, 0, "");
		fps.descriptors = [desc.textStyle({color: "black", fontSize: 36, align: "start"})];
		viewport.add(fps);

		box.setTransformOrigin(data.width / 2, data.height / 2);

		document.body.appendChild(render());

		window.viewport = viewport;
	});
});