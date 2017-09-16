var Components = chrome.extension.getBackgroundPage().Components;

$(function(){
	loadin();
	
	$("body").keydown(eventkeydown);
	checkcountdown();

	//inline
	//i18n.translate();
	Components.getSingleton("Localization").translatePage(document);
	$("#version").append(" " + chrome.runtime.getManifest().version);

	//events
	$("body").on("contextmenu", ctmenu);

	$(".calendar_btn").click(function(){
		chrome.tabs.create({url: "/calendar_full.html"});
	});

	$("#flipbtn").click(switchflip);
	$("#version").click(function(){
		chrome.tabs.create({url: "/update.html"});
	})
	$("#countdownbtn").click(function(){
		Components.getSingleton("CountdownTimer").displayUI();
	});
	$("#helpbtn").click(function(){
		chrome.tabs.create({url: "https://docs.google.com/document/d/1BhBnW1-mzGExFMwz7RtccqRGV6tvnzA1D7ZnyTqf5A8/pub"});
	})
	$("#alarmbtn").click(function(){
		//chrome.extension.getBackgroundPage().alarm
		Components.getSingleton("AlarmClock").displayUI();
	});
	$("#info").click(function(){
		chrome.tabs.create({url: "/statistics.html"});
	})
	$("#timerbtn").click(chrome.extension.getBackgroundPage().timer);
	$("#fb").click(function(){
		chrome.create.tabs({url: "https://www.facebook.com/coolclock"});
	});
	$("#viewsavedalarmbtn").click(function(){
		//chrome.extension.getBackgroundPage().alarm();
		//window.open("alarmrecords.html","_new","width=300,height=300,left=10,top=10");
		Components.getSingleton("AlarmClock").displayUI();
	})
	$("#toggleSize").click(toggle_mini);

	$("#to_left").click(function(){
		//$(this).css({display: 'none'});
		movetoleft();
	})
	$("#to_right").click(function(){
		//$(this).css({display: 'none'});
		movetoright();
	})
	$("#cdremaindiv").click(chrome.extension.getBackgroundPage().countdown);
});

function startTime(){
	var today=new Date();
	today.applyTZ();
	if(localStorage["pm"]=="true"){
		var h=change_time_to_12(today.getHours())
	}else{
		var h=today.getHours()
	}
	m=checkTime(today.getMinutes());
	s=checkTime(today.getSeconds());
	date=today.getDate()
	year=today.getFullYear()
	var week=pupweekday(today.getDay())
	var month=pupmonth(today.getMonth())
	var hi
	if(today.getHours()>=22){
		hi=pupgreeting(3)
	}else if(today.getHours()>=18){
		hi=pupgreeting(2)
	}else if(today.getHours()>=12){
		hi=pupgreeting(1)
	}else if(today.getHours()>=7){
		hi=pupgreeting(0)
	}else{
		hi=pupgreeting(4)
	}
	if(localStorage["pm"]=="true"){
		var ppp=pmam()
	}else{
		var ppp=""
	}
	  

	if(localStorage['language']=="zh-TW"||localStorage['language']=="zh-CN"||localStorage['language']=="zh"||localStorage['language']=="ja"||localStorage['language']=="ko"){
		document.getElementById('txt').innerHTML=ppp+" "+h+":"+m+":"+s+" ";
	}else{
		document.getElementById('txt').innerHTML=h+":"+m+":"+s+" "+ppp;
	}
	document.getElementById('date').innerHTML=date
	document.getElementById('year').innerHTML=year
	document.getElementById('day').innerHTML=week
	document.getElementById('month').innerHTML=month
	document.getElementById('hi').innerHTML=hi
	
	if(localStorage["enabletimezone"]=="true"){
		viewtimezone.innerHTML="("+localStorage["timezone"]+")"
	}
	  
	setTimeout(startTime,500);
}

	function change_time_to_12(num){
	  if(num>12){
		num=num-12
	  }
	  if(num==0){
		num=12
	  }
	  return num;
	  }

	function checkTime(i){
	  if (i<10){
		i="0" + i;
	  }
	  return i;
	}

	function startup(){
	  document.getElementById("startupblocker").style.opacity="0";
	  setTimeout(function(){
		document.getElementById("startupblocker").style.display="none"
	  },700)
	}


	function closewin(){
	  document.getElementById("startupblocker").style.display="block";
	  //IMPORTANT! Must use setTimeout or else it will not work.
	  setTimeout(function(){
	  	document.getElementById('startupblocker').style.opacity='1';
	  }, 0)
	  setTimeout(function(){
		document.body.innerHTML="";
		setTimeout(function(){
			document.body.style.width='250px';
		}, 0);
		setTimeout(function(){
			document.body.style.webkitTransition='all .4s ease-in-out';document.body.style.width='1px';
		}, 40)
	  },700);
	  setTimeout(function(){
		window.close();
	  },1400);
	}

	function ctmenu(){
	  if(localStorage["popup_rc_close"]!="false"){
		closewin();
	  }
	  return false;
	}

	function switchflip(){
	  if(document.getElementById("noflipclock").style.display=="none"){
		document.getElementById("noflipclock").style.display=""
		document.getElementById("flipclock").style.display="none"
		// document.getElementById("flipbtn").parentNode.getElementsByTagName('a')[0].style.display="none"
		localStorage["flipclock"]="false"
	  }else{
		document.getElementById("noflipclock").style.display="none"
		document.getElementById("flipclock").style.display=""
		// document.getElementById("flipbtn").parentNode.getElementsByTagName('a')[0].style.display=""
		localStorage["flipclock"]="true"
	  }
	}

	function setflip(){
	  if(localStorage["flipclock"]=="false"){
		document.getElementById("noflipclock").style.display="none"
		document.getElementById("flipbtn").checked=false
	  }else{
		document.getElementById("noflipclock").style.display=""
		document.getElementById("flipbtn").checked=true
	  }
	  switchflip()
	  
	}

	function online(){
	  eval(localStorage["online"])
	}

	function dateorder(){
	  if(localStorage["dateorder"]!=null){
		var order = JSON.parse(localStorage["dateorder"]);
		var txt="　"
		for(var key in order){
		  if(order[key]=="Year"){
			txt+='<span id="year"></span>,'
		  }else if(order[key]=="Month"){
			txt+='<span id="month"></span>,'
		  }else if(order[key]=="Date"){
			txt+='<font size="6"><span id="date"></span></font>,'
		  }
		}
		txt=txt.slice(0,txt.length-1);
		document.getElementById("datespace").innerHTML=txt
	  }
	}


	//Toogle mini popup
	function toggle_mini(){
	  document.getElementsByTagName("html")[0].classList.toggle("mini");
	  localStorage["mini"]=document.getElementsByTagName("html")[0].classList.contains("mini");
	}


	//Load in stuff
	function loadin(){
	  dateorder();
	  startTime();
	  point_clock();
	  draw_white_thingy();
	  //popuppage();
	  startup();
	  setflip();
	  try{online()}catch(e){console.warn('Error getting data.')};
	  if(localStorage["lunar"]=="true"){
		var d=new Date();
		d.applyTZ();
		d=new Date(d.getFullYear(),d.getMonth(),d.getDate());
		document.getElementById("lunar").innerHTML="<span style='font-size:13px;margin:0 auto;'>("+chrome.extension.getBackgroundPage().Functions.time().getCalendar("lunar")+")</span>";
	  }
	  
	  //Timer btn
	  var temp=""
	  if(localStorage["timer_timestamp"]!=null){
		temp=" - Counting";
		setInterval(function(){
		  document.getElementById("timerbtn").classList.add("counting");
		  setTimeout(function(){
			document.getElementById("timerbtn").classList.remove("counting");
		  },1000)
		},1500)
		if(localStorage["timer_paused_timestamp"]!=null){
		  temp=" - Paused";
		  document.getElementById("timerbtn").classList.remove("counting");
		  //document.getElementById("timerbtn").classList.add("paused");
		  setInterval(function(){
			document.getElementById("timerbtn").classList.add("paused");
			setTimeout(function(){
			  document.getElementById("timerbtn").classList.remove("paused");
			},1000)
		  },1500)
		}
	  }
	  document.getElementById("timerbtn").title+=temp;
	  temp=undefined;

	  //Mini popup
	  if(localStorage["mini"]=="true"){
		document.getElementsByTagName("html")[0].classList.toggle("mini");
	  }

	}
	
	
	
	
//======================
	function checkcountdown(){
		//if(localStorage["alreadycountdown"]!="false"){
		if(Components.getSingleton("CountdownTimer").getAll().length){
			document.getElementById("cdremain").innerText=getcountdownnum()
			document.getElementById("cdprogress").style.width=getcountdownnum("percent")+"%"
		}else{
			document.getElementById("cdremaindiv").style.display="none"
		}
		setTimeout(checkcountdown,500)
	}

	function getcountdownnum(type){
		// assume there exists at least one timer
		var nextTimer = Components.getSingleton("CountdownTimer").getNextScheduledTimer();
		if(type === "percent"){
			return (nextTimer.end - Date.now()) / nextTimer.duration * 100;
		}else{
			return nextTimer.getRemainingString();
		}
		/*
		var txt=0,
			length=0,
			list=JSON.parse(localStorage["countdown"]);
		for(var i=0;i<list.length;i++){
			var cd=list[i];
			if(txt==0){
				txt=Math.round((cd.end-Number(new Date()))/1000);
				length=(cd.end-cd.start)/1000;
			}else{
				if(txt>Math.round((cd.end-Number(new Date()))/1000)){
					txt=Math.round((cd.end-Number(new Date()))/1000);
					length=(cd.end-cd.start)/1000;
				}
			}
		}

		if(type=="percent"){
			return txt/length*100;
		}

		var day=0
		var hour=0
		var min=0
		var sec=0
		for(i=0;i>-1;i++){
			if(txt>86400){
				txt=txt-86400
				day=day+1
			}else{
				break
			}
		}
		for(i=0;i>-1;i++){
			if(txt>3600){
				txt=txt-3600
				hour=hour+1
			}else{
				break
			}
		}
		for(i=0;i>-1;i++){
			if(txt>60){
				txt=txt-60
				min=min+1
			}else{
				break
			}
		}
		sec=txt
		if(sec==60){
			sec=0
		}
		var final=""
		if(day!=0){
			final=day+((day==1)?" day ":" days ")
		}

		if(hour<10){
			hour="0"+hour
		}
		if(min<10){
			min="0"+min
		}
		if(sec<10){
			sec="0"+sec
		}
		final=final+hour+":"+min+":"+sec
		return final
		*/
	}
	
	
//====================
	//Page #
	var page = 2,
		turning = false;

	function eventkeydown(e){
		if(turning == false){
			if(e.keyCode == 37 && page!=1){
				movetoleft();
			}else if(e.keyCode == 39 && page!=3){
				movetoright();
			}else{
				return false;
			}
			turning = true;
			setTimeout(function(){
				turning = false
			},700);
		}
	}


	//move to left page
	function movetoleft(){
		if(turning){
			return false;
		}
		if(page == 2){
			turning = true;
			$("#calendar").css({
				display: "block",
				left: -250
			});
			$("#time").css({
				left: 250
			});
			setTimeout(function(){
				$("#calendar").css({
					left: 0
				});
			}, 1);
			setTimeout(function(){
				$("#time, #whiteb").css("display", "none");
				page--;
				turning = false;
			}, 700);
		}else if(page == 3){
			turning = true;
			$("#time").css({
				display: "block",
				left: -250
			});
			$("#clock").css({
				left: 250
			});
			setTimeout(function(){
				$("#time").css({
					left: 0
				});
			}, 1);
			setTimeout(function(){
				$("#clock, #whiteb").css("display", "none");
				page--;
				turning = false;
			}, 700);
			
		}

	}

	function movetoright(){
		if(turning){
			return false;
		}
		if(page == 1){
			turning = true;
			$("#time").css({
				display: "block"
			});
			$("#calendar").css({
				left: -250
			});
			$("#time").css({
				left: 250
			});
			setTimeout(function(){
				$("#time").css({
					left: 0
				})
			}, 1);
			setTimeout(function(){
				$("#calendar").css({
					display: "none"
				});
				page++;
				turning = false;
			}, 700);

		}else if(page==2){
			turning = true;
			$("#clock").css({
				display: "block"
			});
			$("#time").css({
				left: -250
			});
			$("#clock").css({
				left: 250
			});
			setTimeout(function(){
				$("#clock").css({
					left: 0
				})
			}, 1);
			setTimeout(function(){
				$("#time").css({
					display: "none"
				});
				page++;
				turning = false;
			}, 700);
		}
	}


	//The white border thingy
	function draw_white_thingy(){
		var ctx = document.getElementById('border').getContext('2d')
		var white = ctx.createLinearGradient(260/2,-260,260/2,0); 
		white.addColorStop(0,'rgba(255,255,255,1)');
		white.addColorStop(20/250,'rgba(255,255,255,0)');
		white.addColorStop((250-20)/250,'rgba(255,255,255,0)');
		white.addColorStop(1,'rgba(255,255,255,1)');
		ctx.fillStyle = white;
		ctx.rotate(Math.PI/360*2*90);
		ctx.fillRect(0,-266,266,266)
	}


	//clock
	function point_clock(){
	var today = /*new Date().applyTZ()*/ chrome.extension.getBackgroundPage().Functions.time(),
		sec = today.sec,  
		min = today.min,  
		hr  = today.pm.hour;  
	//hr = hr>=12 ? hr-12 : hr;
	var ctx = document.getElementById('a_clock').getContext('2d')
	ctx.save();  
	ctx.scale(185/32,185/32)
	ctx.clearRect(0,0,32,32);  
	ctx.translate(17,17); 
	ctx.rotate(-Math.PI/2);  
	ctx.strokeStyle = "rgba(0,191,255,1)";  
	ctx.fillStyle = "rgba(65,180,180,1)";  
	ctx.lineWidth = 2;  
	ctx.lineCap = "butt"; 

	//This draws the Circle Behind the arrows.
	ctx.save()
	ctx.beginPath();  
	ctx.arc(0,0,14,0,2 * Math.PI,true)
	ctx.fill();
	ctx.beginPath();  
	ctx.arc(0,0,16,0,2 * Math.PI,true)
	ctx.stroke();
	ctx.strokeStyle = "rgba(255,255,255,0.5)"; 
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(0,14); 
	ctx.lineTo(0,12);
	ctx.moveTo(14,0); 
	ctx.lineTo(12,0);
	ctx.moveTo(0,-12); 
	ctx.lineTo(0,-14);
	ctx.moveTo(-12,0); 
	ctx.lineTo(-14,0);
	ctx.stroke()
	ctx.restore()

	//This draws the Hour arrow.
	ctx.save();
	ctx.lineWidth = 1;  
	ctx.strokeStyle = "rgba(25,25,25,1)"
	ctx.rotate( hr*(Math.PI/6) + (Math.PI/360)*min + (Math.PI/21600)*sec )
	ctx.beginPath();  
	ctx.moveTo(-2,0);  
	ctx.lineTo(10,0);  
	ctx.stroke();  

	/*ctx.beginPath();  
	ctx.moveTo(8,-2);  
	ctx.lineTo(10,0); 
	ctx.lineTo(8,2); 
	ctx.stroke();  */

	ctx.restore(); 

	//This draws the Minute arrow.
	ctx.save();  
	ctx.lineWidth = 1; 
	ctx.strokeStyle = "rgba(0,0,0,1)"
	ctx.rotate( (Math.PI/30)*min + (Math.PI/1800)*sec )  
	ctx.lineWidth = 1;  
	ctx.beginPath();  
	ctx.moveTo(-2,0);  
	ctx.lineTo(14,0);  
	ctx.stroke();  

	/*ctx.beginPath();
	ctx.moveTo(11,-2);
	ctx.lineTo(14,0);
	ctx.lineTo(11,2);
	ctx.stroke();*/
	ctx.restore();  

	//This draws the Second arrow.

	ctx.save();
	ctx.strokeStyle = "rgba(255,0,0,0.7)"
	ctx.rotate(sec * Math.PI/30);  
	ctx.lineWidth = 1;  
	ctx.beginPath();  
	ctx.moveTo(-2,0);  
	ctx.lineTo(14,0);  
	ctx.stroke();  
	ctx.restore();  

	//This draws the The thingy on top.
	ctx.save()
	ctx.fillStyle = "rgba(25,25,25,0.3)"
	ctx.beginPath();  
	ctx.arc(0,0,2,0,360,true)
	ctx.fill();
	ctx.restore()


	ctx.restore()
	setTimeout(point_clock, 500)
	}