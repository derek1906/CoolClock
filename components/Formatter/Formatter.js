Components.define(function(argFormatter, TimeTZ){
	return {
		format: function(){
			var input = argFormatter(arguments, {
				definition: [
					{name: "type", type: "string"},
					{name: "data", type: "*"}
				]
			}, true), args = input.arguments;

			switch(args.type){
				case "duration":
					if(typeof args.data !== "number")	return undefined;
					sec = Math.ceil(args.data);

					var h = (sec / 3600) |0,
						m = (sec % 3600 / 60) |0,
						s = sec % 3600 % 60;

					return "" + (h ? h + ":" : "") + (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);

				case "twoDigitNum":
					if(typeof args.data !== "number")	return undefined;

					return "" + (args.data < 10 ? "0" : "") + args.data;

				case "time":
					if(typeof args.data !== "number")	return undefined;

					return new TimeTZ(args.data).timeString();

				case "hour12TwoDigitHour":
					if(args.data % 12 === 0)	return "12";
					else                    	return this.format("twoDigitNum", args.data % 12);

				case "hour24TwoDigitHour":
					return this.format("twoDigitNum", args.data % 24);
			}
		}
	}
});