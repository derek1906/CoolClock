$(function(){
	//AM or PM
	if(localStorage["pm"]=="true"){
		var ele=document.getElementsByClassName("apm")[0]
		ele.style.opacity=1;
		ele.innerHTML=pmam().toUpperCase();
		try{
			var inside_ele=ele.getElementsByTagName("font")[0]
			inside_ele.outerHTML=inside_ele.innerHTML
		}catch(err){
		  console.log("No sub element found.")
		}
	}
	
	if(location.search!=null){
		document.body.style.webkitTransformOrigin="0 0"
		document.body.style.webkitTransform="scale("+decodeURI(location.search).slice(7,decodeURI(location.search).search(/ /))+","+decodeURI(location.search).slice(decodeURI(location.search).search(/ /)+1,location.search.length+1)+")"
	}

	//check if in popup
	if (self != top){
		var onscroll = function(){window.scrollTo(0,0)}
		document.getElementById("nopopup").style.display="none"
	}

	//check if not in popup
	if (self === top){
		document.body.style.overflowX="visible"
		document.getElementsByTagName("input")[0].value=Math.floor(decodeURI(location.search).slice(7,decodeURI(location.search).search(/ /))*100)
	}
	ctrl();
	setInterval(ctrl, 1000);
	$("body").bind("scroll", onscroll);
	$("body").on("contextmenu", function(){
		return false;
	});

	onscroll && onscroll();
	
	//events
	$("input[type='number']").mouseup(function(){
		location.href = 'flipclock.html?scale='+this.value/100+' '+this.value/100;
	}).blur(function(){
		this.focus();
	}).keydown(function(){
		return false;
	});
});


function flip(mode){
  var d = new Date().applyTZ();
  if(mode=="sec"){
    //var sec=new Date().getSeconds()
    var sec=d.getSeconds()
    sec=((sec+"").length<2)?("0"+sec):(sec)
  }
  if(mode=="min"){
    //var sec=new Date().getMinutes()
    var sec=d.getMinutes()
    sec=((sec+"").length<2)?("0"+sec):(sec)
  }
  if(mode=="hour"){
    //var sec=new Date().getHours()
    var sec=d.getHours()
    if(localStorage["pm"]=="true"){
      if(sec>12){
        sec-=12
      }else if(sec==0){
        sec=12
      }
    }
    sec=((sec+"").length<2)?("0"+sec):(sec)
  }

  document.getElementById(mode+'front').getElementsByTagName("div")[0].innerText=sec
  document.getElementById(mode+'front').style.display="block";
  document.getElementById(mode+'front').style.top="0px";
  document.getElementById(mode+'front').style.height="50px";
  document.getElementById(mode+'up').getElementsByTagName("div")[0].innerText=sec
  setTimeout(function(){
    document.getElementById(mode+'front').style.height="0"
    document.getElementById(mode+'front').style.top="51px"
    document.getElementById(mode+'front').getElementsByTagName("div")[0].style.top="-37px"
    setTimeout(function(){
      document.getElementById(mode+'front').style.height="50px"
      document.getElementById(mode+'down').getElementsByTagName("div")[0].innerText=sec
      setTimeout(function(){
        document.getElementById(mode+'front').style.display="none";
      },100)
    },100)
  },0)
  
}


function ctrl(){
	var d=new Date();
	d.applyTZ();

	flip('sec');
	if(window.min!=d.getMinutes()){
		flip('min');
	}
	if(window.hour!=d.getHours()){
		flip('hour');
	}

	window.min = d.getMinutes();
	window.hour = d.getHours();
}