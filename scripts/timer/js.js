jQuery(loadin);

var paused=false
var time=0
var status


function $(ele){
  return document.getElementById(ele);
}
function $c(ele){
  return document.getElementsByClassName(ele)[0];
}
function $t(ele){
  return document.getElementsByTagName(ele)[0];
}

function resize_window() {

  var height=document.body.offsetHeight

  if(window.win_height!=undefined){
    window.resizeTo(400,win_height)
    return false
  }

  //var frame_height=window.outerHeight-window.innerHeight
  var frame_height=30
  //height=height+frame_height
  height=$("page").offsetHeight+frame_height+8

  console.log("Window height resized to "+height+"px.")

  window.resizeTo(430,height)

}

function move_window(){
  var left=(screen.width/2-430/2)
  var top=(screen.height/2-250/2-50)
  window.moveTo(left,top)
}


//Start counting (start)
function start_count(){
  localStorage["timer_timestamp"]=Number(new Date())
  localStorage["timer_ori_timestamp"]=Number(new Date())
  $c("setting").classList.add("hide");
  $c("counting").classList.remove("hide");
  
  cal_time();

  resize_window();

  window.status="counting"
}


//Calculate time
function cal_time(valueonly){
  if(localStorage["timer_timestamp"]==null){
    return false
  }
  if(paused==true){
    return false
  }

  var ele=$("p_time")
  var t=localStorage["timer_timestamp"]
  var d=Number(new Date())
  if(valueonly){
    return (d-t)
  }
  var content=format(d-t)
  ele.innerHTML=content
  window.time=(d-t)

  window.status="counting"

  setTimeout(cal_time,10)

}


//Stop counting (Pause)
function stop_count(){
  localStorage["timer_paused_timestamp"]=Number(new Date())
  window.paused=true;
  //$("c_button_stop").classList.add("hide");
  $("c_running").classList.add("hide");
  $("c_stopped").classList.remove("hide");

  window.status="paused"
}

//Restart counting
function restart_count(){
  localStorage.removeItem("timer_paused_timestamp");
  localStorage.removeItem("timer_timestamp");
  localStorage.removeItem("timer_ori_timestamp");
  localStorage.removeItem("save_split");
  location=location;
}

//Continue counting
function continue_count(once){
  var t=localStorage["timer_paused_timestamp"]
  var d=Number(new Date())
  localStorage["timer_timestamp"]=((d-parseInt(localStorage["timer_paused_timestamp"],10))+parseInt(localStorage["timer_timestamp"],10))
  localStorage.removeItem("timer_paused_timestamp");
  window.paused=false;
  //$("c_button_stop").classList.remove("hide");
  $("c_running").classList.remove("hide");
  $("c_stopped").classList.add("hide");

  cal_time();
}


//Split
function save_split(){
	var data=[]
	if(localStorage["save_split"]){
		data=JSON.parse(localStorage["save_split"]);
	}
	data[data.length]=cal_time(true);
	data=JSON.stringify(data);
	localStorage["save_split"]=data;
	
	save_split.view();
}

save_split.view=function(){
	if(!save_split.view.opened){
		save_split.view.win=window.open("stopwatch_split.html","_split","width=300,height=600");
		save_split.view.win.addEventListener('load',function(){
			save_split.view.win.addEventListener('unload',function(){
				save_split.view.opened=false;
			});
		});
		save_split.view.opened=true;
	}else{
		save_split.view.win.focus();
	}
}
save_split.view.opened=false;

//Load in
function loadin(){
	if(location.hash == "#noti"){
		jQuery("html").attr("id", "noti");
		jQuery("#stay").attr("checked", true);
		jQuery(".option>*:eq(0)").nextAll("br").replaceWith(" ");
		setTimeout(function(){
			window.scrollTo(5,5);
		},1);
	}
	
	//events
	jQuery(window).bind("resize", resize_window);
	jQuery(window).bind("beforeunload", quit);
	jQuery("body").on("contextmenu", function(){
		document.body.style.cursor="not-allowed";
		setTimeout(function(){
			document.body.style.cursor="default";
		},300)
		return false;
	});

  //Setting page
  $("s_button_start").addEventListener("click",start_count,false);
  $("s_button_close").addEventListener("click",(function(){window.close()}),false);

  //Counting page
  $("c_button_stop").addEventListener("click",stop_count,false);
  $("c_button_split").addEventListener("click",save_split,false);
  $("c_button_viewsplit").addEventListener("click",save_split.view,false);
  $("c_button_continue").addEventListener("click",continue_count,false);
  $("c_button_restart").addEventListener("click",restart_count,false);
  $("c_button_close").addEventListener("click",(function(){window.close()}),false);
  $("o_units").addEventListener("change", function(){
	localStorage['timer_units'] = this.checked;
	window.units = this.checked;
  });
	jQuery("#stay").change(function(){
    /*
		if(this.checked){
			webkitNotifications.createHTMLNotification("/timer.html#noti").show();
			window.close();
		}else{
			chrome.extension.getBackgroundPage().timer();
			window.close();
		}*/
	});
	jQuery("#stay").attr("disabled", true);

  //Note
  $c("n_close").addEventListener("click",(function(){$c("note").classList.add("hide");resize_window()}),false);

  window.status="setting"

  if(localStorage["timer_timestamp"]!=null){
    window.status="counting"

    $c("setting").classList.add("hide");
    $c("counting").classList.remove("hide");
      if(localStorage["timer_paused_timestamp"]!=null){
        window.paused=true;
        //$("c_button_stop").classList.add("hide");
        $("c_running").classList.add("hide");
        $("c_stopped").classList.remove("hide");
        $("p_time").innerHTML=format(localStorage["timer_quit_msg"])
        window.time=parseInt(localStorage["timer_quit_msg"],10);

        window.status="paused"
      }
    cal_time();
    resize_window();
  }else{
    $c("setting").classList.remove("hide");
    $c("counting").classList.add("hide");
  }


  //Logging
  console.group("Log");
  console.log("Note:'undefined' means not set.");
  console.log("  Start time: "+localStorage["timer_timestamp"]);
  console.log("  Paused time: "+localStorage["timer_paused_timestamp"]);
  console.log("  Quit Msg: "+localStorage["timer_quit_msg"]);
  console.log("  Status: \""+window.status+"\"");
  console.groupEnd();

  console.groupCollapsed("Other Logs");

  //Status Writer
  setInterval(status_writer,100);

  //Load in settings
  restore();


  //Translations
  i18n.translate();
  
  move_window();
  resize_window();
  setInterval(resize_window,30000);
}


//Restore settings
function restore(){
  $("o_units").checked = (localStorage['timer_units'] == true);
  window.units = $("o_units").checked

}



function format(t){
  var txt=parseInt(t,10)
  var ms=txt%1000
  ms=Math.floor(ms/1000*100)
  //I dont know why it has to +50 and -50.
  if(ms<50){ms+=50}else if(ms>=50){ms-=50}
  txt/=1000
  var hour=0;
  var min=0;
  var sec=0;
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
  sec=txt.toFixed();
  if(sec==60){
    sec=0
    min=min+1
  }
  hour=add_zero(hour)
  min=add_zero(min)
  sec=add_zero(sec)
  ms=add_zero(ms)
  var content=hour+":"+min+":"+sec+"."+ms
  if(window.units==true){
    content=content.replace(/:/,"h ").replace(/:/,"m ")+"s"
  }

    return content

}
function add_zero(t){
	if(t<10){return "0"+t}else{return t};
}

//Write status
function status_writer(){
  var s=window.status,
  	t=i18n("timer"),
  	b=" - "+i18n("extName");

  if(s=="setting"){
    document.title=t+b
    $t("h2").innerHTML=t
  }else if(s=="counting"){
    document.title=t+" - Running"+b
    $t("h2").innerHTML=t+" - Running"
  }else if(s=="paused"){
    document.title=t+" - Paused"+b
    $t("h2").innerHTML=t+" - Paused"
  }else{
    document.title=t+b
    $t("h2").innerHTML=t
  }

  $("c_starttime").innerHTML=new Date(parseInt(localStorage["timer_ori_timestamp"]));
  $("c_starttime").setAttribute("title",new Date(parseInt(localStorage["timer_ori_timestamp"])));

}

function quit(){
	if(localStorage["timer_paused_timestamp"]!=null){
		localStorage["timer_quit_msg"]=window.time
	}
	
	if(save_split.view.opened){
		save_split.view.win.close();
	}
}
