Components.define(function(argFormatter, Graphics, Formatter, storage){

	function applyDefault(preset, input){
		if(typeof input !== "object")	return preset;

		for(var key in input){
			preset[key] = input[key];
		}
		return preset;
	}

	function GraphicsEntity(entity, methods){
		this.entity = entity;

		if(typeof methods === "object"){
			for(var name in methods){
				this[name] = methods[name];
			}
		}
	}
	GraphicsEntity.prototype.render = function(){
		return this.getEntity().render();
	};
	GraphicsEntity.prototype.getEntity = function(){
		return this.entity;
	};

	var presets = {
		// analog clock model
		"analog-clock": function(data){
			data = applyDefault({
				width: 128, height: 128,
				strokeWidth: 4,
				minY: 10/(128/2), hrY:30/(128/2),
				minColor: "lightgray", hrColor: "gray",
				flatTip: false,
				circleBorder: false, circleBorderWidth: 3, circleBorderColor: "#6E6E6E",
				background: "transparent", clockBg: "transparent",
				indicationLines: true,
				notificationBg: false
			}, data);

			var desc = Graphics.Descriptors, noStroke = desc.stroke(0), noFill = desc.fill();

			var analogClock = Graphics.create(data.width, data.height);
			analogClock.id = "AnalogClock";

			var clockfaceRadius = data.width / 2 - (data.circleBorder ? data.circleBorderWidth : 0);

			// background
			var background = new Graphics.Shapes.Rect(0, 0, data.width, data.height);
			background.descriptors = [noStroke, desc.fill(data.background)];
			background.id = "AnalogClock:background";
			analogClock.add(background);

			// clockface
			var clockface = new Graphics.Shapes.Circle(data.width / 2, data.height / 2, clockfaceRadius);
			clockface.id = "AnalogClock:clockface";
			var clockfaceBorder = noStroke,
			    clockfaceBackground = noFill;

			if(data.circleBorder)             	clockfaceBorder = desc.stroke(data.circleBorderWidth, data.circleBorderColor);
			if(data.notificationBg)           	clockfaceBackground = desc.fill("rgb(245,245,245)");
			if(data.clockBg !== "transparent")	clockfaceBackground = desc.fill(data.clockBg);

			clockface.descriptors = [clockfaceBorder, clockfaceBackground];
			analogClock.add(clockface);

			// indication lines
			if(data.indicationLines){
				for(var i = 0; i < 12; i++){
					var line = new Graphics.Shapes.Rect(clockfaceRadius, clockfaceRadius, 1, 5);
					line.setTransform("translate", {dx: -0.5, dy: -clockfaceRadius + 5});
					line.setTransform("rotate", i * 30 * Math.PI / 180);
					line.descriptors = [noStroke, desc.fill("rgb(200,200,200)")];

					clockface.add(line);
				}
			}

			// hour hand
			var hourHand = new Graphics.Shapes.Rect(
				clockfaceRadius, clockfaceRadius, 
				data.strokeWidth, clockfaceRadius * (1 - data.hrY));
			hourHand.id = "AnalogClock:hourHand";
			hourHand.setTransform("translate", {dx: -data.strokeWidth / 2, dy: 0});
			hourHand.descriptors = [noStroke, desc.fill(data.hrColor)];

			clockface.add(hourHand);

			// minute hand
			var minuteHand = new Graphics.Shapes.Rect(
				clockfaceRadius, clockfaceRadius, 
				data.strokeWidth, clockfaceRadius * (1 - data.minY));
			minuteHand.id = "AnalogClock:minuteHand";
			minuteHand.setTransform("translate", {dx: -data.strokeWidth / 2, dy: 0});
			minuteHand.descriptors = [noStroke, desc.fill(data.minColor)];

			clockface.add(minuteHand);



			// generate GraphicsEntity
			var controller = new GraphicsEntity(analogClock, {
				setTime: function(currentTime){
					currentTime.setSeconds(currentTime.getSeconds() /*+ 100*/);
					var minAngle = (currentTime.getMinutes() / 60 + currentTime.getSeconds() / 60 / 60) * Math.PI * 2,
						hrAngle = ((currentTime.getHours() % 12) / 12 + currentTime.getMinutes() / 60 / 12 + currentTime.getSeconds() / 60 / 60 / 12) * Math.PI * 2;

					hourHand.setTransform("rotate", hrAngle - Math.PI);
					minuteHand.setTransform("rotate", minAngle - Math.PI);
				}
			});

			return controller;
		},
		// digital clock model
		"digital-clock": function(data){
			data = applyDefault({
				width: 32,
				height: 32,
				minXY: [8, 30],
				hrXY: [0, 15],
				font: "default",
				hrFontSize: 18,
				minFontSize: 18,
				shadow: false,
				background: "transparent",
				textColor: "black"
			}, data);

			// sets default font
			if(data.font === "default")	data.font = "Roboto-Medium";

			var desc = Graphics.Descriptors;

			var digitalClock = Graphics.create(data.width, data.height);
			digitalClock.id = "DigitalClock";

			var background = new Graphics.Shapes.Rect(0, 0, data.width, data.height);
			background.id = "DigitalClock:background";
			background.descriptors = [desc.stroke(0), desc.fill(data.background)];

			var shadowContainer = new Graphics.Containers.Shadow(digitalClock, data.width, data.height);

			// hour text
			var hourText = new Graphics.Shapes.Text(data.hrXY[0], data.hrXY[1], "");
			hourText.id = "DigitalClock:hourText";
			hourText.descriptors = [desc.textStyle({
				fontFamily: data.font,
				fontSize: data.hrFontSize,
				baseline: "alphabetic",
				color: data.textColor
			})];

			// minute text
			var minuteText = new Graphics.Shapes.Text(data.minXY[0], data.minXY[1], "");
			minuteText.id = "DigitalClock:minuteText";
			minuteText.descriptors = [desc.textStyle({
				fontFamily: data.font,
				fontSize: data.minFontSize,
				baseline: "alphabetic",
				color: data.textColor
			})];

			digitalClock.add(background);

			if(data.shadow){
				digitalClock.add(shadowContainer);
				shadowContainer.add(hourText);
				shadowContainer.add(minuteText);
			}else{
				digitalClock.add(hourText);
				digitalClock.add(minuteText);
			}

			var controller = new GraphicsEntity(digitalClock, {
				setTime: function(currentTime, hour12){
					var hour = currentTime.getHours(),
						minute = currentTime.getMinutes();

					hourText.set("text", Formatter.format(hour12 ? "hour12TwoDigitHour" : "hour24TwoDigitHour", hour) + ":");
					minuteText.set("text", Formatter.format("twoDigitNum", minute));
				}
			});

			return controller;
		},
		// notification main body template model
		"notification-main": function(){
			var width = 360, height = 240, desc = Graphics.Descriptors,
				focusedHour12Label = desc.textStyle({
					color: "rgba(255, 255, 255, 1)", fontSize: 20, fontFamily: "Roboto-Thin",
					align: "left", baseline: "alphabetic",
				}),
				defocusedHour12Label = desc.textStyle({
					color: "rgba(255, 255, 255, 0.2)", fontSize: 20, fontFamily: "Roboto-Thin",
					align: "left", baseline: "alphabetic",
				}),
				hour12LabelShadow = desc.shadow(0, 0, "rgba(0,0,0,0.7)", 5),
				captionShadow = desc.shadow(0, 2, "rgba(0,0,0,0.5", 5),
				subcaptionShadow = desc.shadow(0, 0, "rgba(0,0,0,0.7)", 5);

			var body = Graphics.create(width, height);

			// background
			var background = new Graphics.Shapes.Rect(0, 0, width, height);
			// temp
			background.descriptors = [desc.stroke(0), desc.fill(storage.get("noti_bgColor", true))];
			body.add(background);

			// shadow
			var shadowContainer = new Graphics.Containers.Shadow(body, width, height);
			body.add(shadowContainer);

			// main text
			var mainText = new Graphics.Shapes.Text(width / 2, height / 2, "");
			mainText.id = "mainText";
			mainText.descriptors = [desc.textStyle({
				color: "white",
				fontSize: 60,
				fontFamily: "Roboto-Thin",
				align: "center",
				baseline: "alphabetic"
			})];
			shadowContainer.add(mainText);

			// hour12 text container
			var hour12LabelContainer = new Graphics.Containers.Transformable(width / 2, height / 2, 100, 100);
			hour12LabelContainer.setTransform("translate", {dx: 0, dy: -60});
			body.add(hour12LabelContainer);

			// am/pm
			var amText = new Graphics.Shapes.Text(0, 30, "am"),
				pmText = new Graphics.Shapes.Text(0, 50, "pm");
			
			hour12LabelContainer.add([amText, pmText]);

			// caption
			var caption = new Graphics.Containers.Sentence(width / 2, 155, {align: "center", baseline: "alphabetic"});
			//caption.setText([{text: "Hello world!", fontSize: 20, fontFamily: "Roboto-Thin", color: "white", descriptors: [captionShadow]}]);
			body.add(caption)

			// sub-caption
			var subcaption = new Graphics.Containers.Sentence(width / 2, 180, {align: "center", baseline: "alphabetic"});
			//subcaption.setText([{text: "Lorem ipsum", fontSize: 15, fontFamily: "Roboto-Thin", color: "white", descriptors: [subcaptionShadow]}]);
			body.add(subcaption)



			var controller = new GraphicsEntity(body, {
				setTime: function(currentTime, hour12){
					var hour = currentTime.getHours(),
						minute = currentTime.getMinutes();

					mainText.set("text",	Formatter.format(hour12 ? "hour12TwoDigitHour" : "hour24TwoDigitHour", hour) + ":" + 
					                    	Formatter.format("twoDigitNum", minute));

					// set am/pm text visibility
					hour12LabelContainer.set("hidden", !hour12);
					// adjust am/pm text x
					hour12LabelContainer.setTransform("translate", {dx: mainText.getWidth() / 2 + 5, dy: -60});
					// focus am/pm text
					if(hour < 12){
						amText.set("descriptors", [focusedHour12Label, hour12LabelShadow]);
						pmText.set("descriptors", [defocusedHour12Label, hour12LabelShadow]);
					}else{
						amText.set("descriptors", [defocusedHour12Label, hour12LabelShadow]);
						pmText.set("descriptors", [focusedHour12Label, hour12LabelShadow]);
					}
				},
				setCaption: function(content){
					content.forEach(function(fragment){
						fragment.descriptors = [captionShadow];
					});
					caption.setText(content);
				},
				setSubcaption: function(content){
					content.forEach(function(fragment){
						fragment.descriptors = [subcaptionShadow];
					});
					subcaption.setText(content);
				}
			});

			return controller;
		},
		// notification icon template model
		"notification-icon": function(){
			var clockModel = app.create("analog-clock", {
				width: 50, height: 50,
				flatTip: true, strokeWidth: 5,
				minY: 0.1, hrY: 0.4,
				minColor: "rgb(231,101,87)",
				hrColor: "rgb(231,101,87)",
				indicationLines: false,
			});

			var desc = Graphics.Descriptors,
				width = 80, height = 80,
				boxWidth = 50, boxHeight = 50;

			var viewmodel = Graphics.create(width, height),
				background = new Graphics.Shapes.Rect(0, 0, width, height);
				box = new Graphics.Shapes.Rect(15, 15, boxWidth, boxHeight, 7),
				shadow = new Graphics.Containers.Shadow(box, boxWidth, boxHeight),
				circleCap = new Graphics.Shapes.Circle(boxWidth / 2, boxHeight / 2, 3.5);

			viewmodel.add([background, box]);
			box.add(shadow);
			shadow.add([clockModel.getEntity(), circleCap]);

			background.descriptors = [desc.stroke(0), desc.fill(storage.get("noti_bgColor", true))];
			box.descriptors = [desc.stroke(0), desc.fill("rgb(236,240,241)")];
			circleCap.descriptors = [desc.stroke(0), desc.fill("rgb(219,93,80)")];

			return new GraphicsEntity(viewmodel, {
				setTime: function(time){
					return clockModel.setTime(time);
				}
			});
		}
	};

	var app = {
		create: function(name, data){
			if(!name || typeof name !== "string")	throw new Error("GraphicsPresets.create requires a string \"name\".");

			if(presets[name])
				return presets[name](data);
			else
				return null;
		}
	};

	return app;
});