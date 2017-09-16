			function $(e){
				return document.querySelectorAll(e);
			}
			function ce(e){
				return document.createElement(e);
			}
			
			function resize_it(){
				var ele=document.getElementsByTagName("div")[0]
				var w=ele.offsetWidth
				var h=ele.offsetHeight
				window.resizeTo(w+10+8,h+25);
				
				if(h+25>screen.height){
					$("body")[0].style.overflowY="scroll";
				}
			}

			function move_it(){
				var sw=screen.width
				var sh=screen.height
				var w=window.outerWidth
				var h=window.outerHeight
				window.moveTo(sw/2-w/2,sh/2-h/2-50)

			}
			
			
			function show_splits(){
				$("div#splits")[0].innerHTML="";
			
				var table=ce("table"),
					tbody=ce("tbody"),
					tr=ce("tr"),
					td1=ce("td"),
					td2=ce("td"),
					td3=ce("td"),
					span=ce("span");
				
				td2.innerHTML="Time";
				td3.innerHTML="Duration";
				tr.appendChild(td1);
				tr.appendChild(td2);
				tr.appendChild(td3);
				tbody.appendChild(tr);
				
				if(localStorage["save_split"]){
					var splits=JSON.parse(localStorage["save_split"]);
					for(var i=0;i<splits.length;i++){
						var ltr=ce("tr"),
							ltd1=ce("td"),
							ltd2=ce("td"),
							ltd3=ce("td"),
							time=splits[i],
							duration;
						
						if(i==0){
							duration=time;
						}else{
							duration=time-splits[i-1];
						}
						
						ltd1.innerHTML="#"+(i+1);
						ltd2.innerHTML=format(time);
						ltd3.innerHTML=format(duration);
						
						ltr.appendChild(ltd1);
						ltr.appendChild(ltd2);
						ltr.appendChild(ltd3);
						tbody.appendChild(ltr);
						
						span.innerHTML="Reset stopwatch to clear splits."
					}
				}else{
					var ltr=ce("tr"),
						ltd=ce("td");
					
					ltd.setAttribute("colspan",3);
					ltd.innerHTML="<b>No split found</b>";
					
					ltr.appendChild(ltd);
					tbody.appendChild(ltr);
				}
				
				table.appendChild(tbody);
				$("div#splits")[0].appendChild(table);
				$("div#splits")[0].appendChild(span);
			}
			
			function format(t){
				function add_zero(t){
					if(t<10){
						return "0"+t
					}else{
						return ""+t
					}
				}
			
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
				min=add_zero(min);
				sec=add_zero(sec);
				ms=add_zero(ms);
				var content=hour+":"+min+":"+sec+"."+ms
				//if(window.units==true){
				//	content=content.replace(/:/,"h ").replace(/:/,"m ").replace(/:/,"s ")
				//}

				return content
			}
			
			//Block right-click
			function no_cm(){
				$("body")[0].style.cursor="not-allowed";
				setTimeout(function(){
					document.body.style.cursor="default";
				},300)
			}
			
			jQuery(function(){
				//events
				jQuery(window).bind("resize", resize_it);
				jQuery("body").on("contextmenu", function(){
					document.body.style.cursor="not-allowed";
					setTimeout(function(){
						document.body.style.cursor="default";
					},300)
					return false;
				});
				
				show_splits();
				resize_it();
				move_it();
				
				setInterval(function(){
					show_splits();
					resize_it();
				},500);
			});