Number.prototype.addZero = function(){
    return (this < 10 ? "0" : "") + this;
};

var position = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

$(function(){
    $(".left_btn").click(prev);
    $(".right_btn").click(next);
})

function next() {
    // if(window.targetMonth.getMonth() < 11 && window.targetMonth.getMonth() >= 0) {
    //     window.targetMonth.setMonth(window.targetMonth.getMonth() + 1)
    // }
    // if(window.targetMonth.getMonth() == 11) {
    //     document.getElementsByClassName("right_btn")[0].classList.add("hide")
    //     document.getElementsByClassName("right_btn_dis")[0].classList.remove("hide")
    // } else {
    //     document.getElementsByClassName("left_btn")[0].classList.remove("hide")
    //     document.getElementsByClassName("left_btn_dis")[0].classList.add("hide")
    // }
    // write_cal()

    position.setMonth(position.getMonth() + 1);
    start();
}

function prev() {
    // if(window.targetMonth.getMonth() <= 11 && window.targetMonth.getMonth() > 0) {
    //     window.targetMonth.setMonth(window.targetMonth.getMonth() - 1)
    // }
    // if(window.targetMonth.getMonth() == 0) {
    //     document.getElementsByClassName("left_btn")[0].classList.add("hide")
    //     document.getElementsByClassName("left_btn_dis")[0].classList.remove("hide")
    // } else {
    //     document.getElementsByClassName("right_btn")[0].classList.remove("hide")
    //     document.getElementsByClassName("right_btn_dis")[0].classList.add("hide")
    // }
    // write_cal()

    position.setMonth(position.getMonth() - 1);
    start();
}

// function write_cal() {
//     clear_cal();
//     if(window.targetMonth.getMonth() == new Date().getMonth()) {
//         start();
//         //starttodo();
//         return false
//     }

//     //write it.
//     var date = targetMonth
//     var year = date.getFullYear()
//     var month = date.getMonth()
//     var day = date.getDay()

//     var monthdays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
//     if(((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0)) {
//         monthdays[1] = 29;
//     }

//     document.getElementById('yearnmonth').innerHTML = year + " " + pupmonth(month)

//     for(i = 1; i <= monthdays[month]; i++) {
//         date.setDate(i);
//         var id = Math.ceil(date.getDate() / 7 + ((date.getDay() < day) ? (1) : (0))) + "" + date.getDay()
//         document.getElementById(id).innerText = i;
//         document.getElementById("td" + id).classList.add("exist")
//         if(JSON.parse(localStorage["lunar"])) {
//             document.getElementById("td" + id).title = GetLunarDateString(date);
//         }
//     }
//     date.setDate(1)

//     document.getElementById("todo").innerHTML = +year + " " + pupmonth(month)
//     document.getElementById("selected").innerHTML = "Back..."
//     document.getElementById("selected").title = "Back..."
//     document.getElementById("selected").setAttribute("onclick", "window.targetMonth.setMonth(new Date().getMonth());write_cal();")
//     document.getElementById("selected").style.cursor = "pointer"
// }


//Reset Calendar

// function clear_cal() {
//     var ele = document.getElementsByClassName("date")
//     for(i = 0; i < ele.length; i++) {
//         ele[i].removeAttribute("onmouseover")
//         ele[i].removeAttribute("onmouseout")
//         ele[i].removeAttribute("onclick")
//         ele[i].removeAttribute("style")
//         ele[i].setAttribute("style", "")
//         ele[i].classList.remove("exist")
//         ele[i].getElementsByTagName("span")[0].classList.remove("eventday")
//         ele[i].getElementsByTagName("span")[0].innerHTML = ""
//         ele[i].getElementsByTagName("span")[0].removeAttribute("style")
//         ele[i].getElementsByTagName("span")[0].setAttribute("style", "")
//         ele[i].getElementsByTagName("span")[0].removeAttribute("title")
//     }
//     for(i = 0; i < ele.length; i++) {
//         ele[i].removeAttribute("onmouseover")
//         ele[i].removeAttribute("onmouseout")
//         ele[i].removeAttribute("onclick")
//         ele[i].removeAttribute("style")
//         ele[i].setAttribute("style", "")
//         ele[i].classList.remove("exist")
//         ele[i].getElementsByTagName("span")[0].classList.remove("eventday")
//         ele[i].getElementsByTagName("span")[0].innerHTML = ""
//         ele[i].getElementsByTagName("span")[0].removeAttribute("style")
//         ele[i].getElementsByTagName("span")[0].setAttribute("style", "")
//         ele[i].getElementsByTagName("span")[0].removeAttribute("title")
//     }

//     document.getElementById("todo").innerHTML = "";
//     document.getElementById("selected").innerHTML = "";
//     document.getElementById("selected").title = "";
//     document.getElementById("selected").removeAttribute("onclick");
//     document.getElementById("selected").style.cursor = "default";
// }

// var nowonwhatdat,
//     lastnoborder,
//     targetMonth = new Date(new Date().getFullYear(), new Date().getMonth());

//***************************************************
//PROCEDURE:
//1.Get all dates information.
//2.Find what day is the first day of the month.
//3.Use "for" to write all days down.
//4.When mouse's on the cell, it'll change its color.
//***************************************************

function start() {
    var monthdays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    var today = position,
        year = today.getFullYear();

    // nowonwhatdate = date

    //Check if this year's Feburary has 29 days.
    if(((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0)) {
        monthdays[1] = 29;
    }

/*
    //j means "add how many days to today's date".
    var j = 0

    //find what day is the first day.
    var d = day
    for(i = date; i > 1; i--) {
        if(d == 0) {
            d = 7
        }
        d = d - 1
    }

    //Write the days from 1st.
    var row = 1
    //t_date is the first day of that month.
    var t_date = 1
    for(i = d; t_date + j <= monthdays[month - 1]; i++) {
        if(i == 0 || i == 6) {
            document.getElementById(row + "" + i).innerHTML = '<span onmouseover=document.getElementById("td' + row + '' + i + '").style.backgroundColor="blue";document.getElementById("td' + row + '' + i + '").style.color="white" onmouseout=document.getElementById("td' + row + '' + i + '").style.backgroundColor="orange";document.getElementById("td' + row + '' + i + '").style.color="red" style="cursor:pointer;text-decoration:none" onClick="noborder(' + "'" + '' + row + '' + i + "'" + ');nowonwhatdate=' + (t_date + j) + ';writetodo(' + (t_date + j) + ')">' + (t_date + j) + '</span>'
        } else {
            document.getElementById(row + "" + i).innerHTML = '<span onmouseover=document.getElementById("td' + row + '' + i + '").style.backgroundColor="blue";document.getElementById("td' + row + '' + i + '").style.color="white" onmouseout=document.getElementById("td' + row + '' + i + '").style.backgroundColor="orange";document.getElementById("td' + row + '' + i + '").style.color="black" style="cursor:pointer;text-decoration:none" onClick="noborder(' + "'" + '' + row + '' + i + "'" + ');nowonwhatdate=' + (t_date + j) + ';writetodo(' + (t_date + j) + ')">' + (t_date + j) + '</span>'
        }
        document.getElementById("td" + row + "" + i).classList.add("exist")

        //console.log('localStorage["todo"'+(new Date().getMonth()+3)+""+(t_date+j)+']')
        if(localStorage["todo" + (new Date().getMonth() + 1) + "" + (t_date + j)] != null) {
            document.getElementById(row + "" + i).classList.add("eventday")
            document.getElementById(row + "" + i).title = "> " + localStorage["todo" + (new Date().getMonth() + 1) + "" + (t_date + j)]
        }

        if(t_date + j == date) {
            document.getElementById(row + "" + i).innerHTML = '<span onmouseover=document.getElementById("td' + row + '' + i + '").style.backgroundColor="skyblue" onmouseout=document.getElementById("td' + row + '' + i + '").style.backgroundColor="green" style="cursor:pointer;text-decoration:none" onClick="noborder(' + "'" + '' + row + '' + i + "'" + ');nowonwhatdate=' + (t_date + j) + ';writetodo(' + (t_date + j) + ')">' + (t_date + j) + '</span>'
            document.getElementById("td" + row + day).style.backgroundColor = "green"
            document.getElementById("td" + row + day).style.color = "white"
            lastnoborder = row + "" + i
        }
        j = j + 1
        //Go to next row.
        if(i == 6) {
            i = -1
            row = row + 1
        }
    }
    j = 0
*/

    var mainCalendar = $("#mainCalendar td"),
        currentDate = position,
        firstDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
        firstDateDay = firstDate.getDay();
    mainCalendar.each(function(i){
        if(i > 7 && i + 1 != mainCalendar.length){
            $(this).empty().removeClass("exist eventday today");
        }
    });
    for(var i = firstDateDay + 7 + 1, j = 1; i < monthdays[firstDate.getMonth()] + firstDateDay + 7 + 1; i++, j++){
        var todo = chrome.extension.getBackgroundPage().Functions.ls("todo").json[
                    "" + currentDate.getFullYear() + (currentDate.getMonth()+1) + (currentDate.getDate() + j - 1) ];
        $(mainCalendar[i])
            .unbind()
            .html(j)
            .addClass("exist")
            .addClass(todo?"eventday":null)
            .addClass(j == new Date().getDate() && currentDate.getMonth() == new Date().getMonth() && currentDate.getFullYear() == new Date().getFullYear() ? "today":null)
            .data("date", {
                year: currentDate.getFullYear(),
                month: currentDate.getMonth(),
                date: currentDate.getDate() + j - 1,
                todo: todo
            })
            .hover(function(){
                var date = $(this).data("date"),
                    todo = date.todo;
                if(todo){
                    $("#todo").html(todo.length + " existing to-dos");
                    $(this).click(function(){
                        chrome.tabs.create({
                            url: "/calendar_full.html?timestamp=" + encodeURI([date.year, date.month, date.date].join("-"))
                        })
                    })
                }else{
                    $("#todo").html("No todo saved.");
                }
            }, function(){
                $("#todo").empty();
            });
    }

    $('#yearnmonth').html(currentDate.getFullYear() + " " + pupmonth(currentDate.getMonth()));

}

// function starttodo() {

//     var today = new Date()
//     var year = today.getYear()
//     year = year + 1900
//     var month = today.getMonth()
//     month = month + 1
//     var day = today.getDay()
//     var date = today.getDate()

//     writetodo(date)
// }



// function writetodo(clickdate) {

//     var today = new Date()
//     var year = today.getYear()
//     year = year + 1900
//     var month = today.getMonth()
//     month = month + 1
//     var day = today.getDay()
//     var date = today.getDate()

//     if(localStorage[("todo" + month + "" + clickdate)] == null) {
//         document.getElementById('todo').innerHTML = "No to-do is saved."
//     } else {
//         testspan.innerHTML = localStorage[("todo" + month + "" + clickdate)]
//         if(Number(document.getElementById('testspan').offsetWidth) > 120) {
//             var txt = ""
//             for(i = Number(localStorage[("todo" + month + "" + clickdate)].length); Number(document.getElementById('testspan').offsetWidth) > 120; i = i - 1) {
//                 txt = localStorage[("todo" + month + "" + clickdate)].slice(0, i)
//                 document.getElementById('testspan').innerHTML = txt
//             }
//             document.getElementById('todo').innerHTML = "<span style='-webkit-user-select:none;cursor:default;'>➭</span>" + txt + "…" + "<button style='height:17px;width:15px;margin:0px;padding:0px;float:right' onclick='alerttodo()' title='Show full to-do'>+</button>"
//         } else {
//             document.getElementById('todo').innerHTML = "<span style='-webkit-user-select:none;cursor:default;'>➭</span>" + localStorage[("todo" + month + "" + clickdate)]
//         }
//     }
//     document.getElementById('testspan').innerHTML = ""
//     var selected_txt = /*"<img src='images/cursor-hand.gif' height=16 width=14>"+*/
//         pupmonth(month - 1) + " " + clickdate + ", Wk " + new Date(year, month - 1, clickdate).getWeek()
//     document.getElementById('selected').innerHTML = selected_txt
//     document.getElementById('selected').title = "Selected: " + year + " " + selected_txt.replace(/Wk/, "Week")

// }

// function edittodo() {

//     var today = new Date()
//     var year = today.getYear()
//     year = year + 1900
//     var month = today.getMonth()
//     month = month + 1
//     var day = today.getDay()
//     var date = today.getDate()

//     var oldtxt

//     (localStorage[("todo" + month + "" + nowonwhatdate)] == null || localStorage[("todo" + month + "" + nowonwhatdate)] == "") ? oldtxt = "Enter to-do(s) here." : oldtxt = localStorage[("todo" + month + "" + nowonwhatdate)]

//     var txt = prompt('Please enter your to-do:\n\n - Leave it blank to clear the to-do on that day.', oldtxt)

//     if(!txt) {
//         if(txt == "") {
//             delete localStorage[("todo" + month + "" + nowonwhatdate)]
//             writetodo(nowonwhatdate)
//             location.reload()
//             return false
//         } else {
//             return false
//         }
//     }

//     localStorage[("todo" + month + "" + nowonwhatdate)] = txt

//     writetodo(nowonwhatdate)
//     location.reload()
// }

// function alerttodo() {

//     var today = new Date()
//     var year = today.getYear()
//     year = year + 1900
//     var month = today.getMonth()
//     month = month + 1
//     var day = today.getDay()
//     var date = today.getDate()



//     var alerttxt = month + "/" + nowonwhatdate + "/" + year + "\n\n" + "> " + localStorage[("todo" + month + "" + nowonwhatdate)]
//     alert(alerttxt)

// }


// function noborder(td) {
//     if(lastnoborder == td) {
//         if(document.getElementById(lastnoborder).style.backgroundColor == "") {
//             document.getElementById(td).style.backgroundColor = "bule"
//         } else {
//             document.getElementById(td).style.backgroundColor = ""
//         }
//     } else {
//         document.getElementById(lastnoborder).style.backgroundColor = ""
//         document.getElementById(td).style.backgroundColor = "blue"
//     }
//     lastnoborder = td
// }


$(function(){
	//events
	$("body").on("mousewheel", function(e){
		console.log(e);
		(e.originalEvent.wheelDelta > 0) ? prev() : next();
	})

	//main
	start();
	//starttodo();
});

