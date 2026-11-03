const timerApi = globalThis.browser || globalThis.chrome;
const timerKeys = [
  'timer_timestamp',
  'timer_ori_timestamp',
  'timer_paused_timestamp',
  'timer_quit_msg',
  'save_split',
  'timer_units'
];
const timerValues = {};
function saveTimerValue(key, value) {
  timerValues[key] = value;
  return timerApi.storage.local.set({ ['coolClockLegacy:' + key]: value });
}
function removeTimerValue(key) {
  delete timerValues[key];
  return timerApi.storage.local.remove('coolClockLegacy:' + key);
}
document.addEventListener('DOMContentLoaded', async () => {
  const [stored, response] = await Promise.all([
    timerApi.storage.local.get(timerKeys.map((key) => 'coolClockLegacy:' + key)),
    timerApi.runtime.sendMessage({ target: 'worker', type: 'get' })
  ]);
  if (!response?.ok) throw Error(response?.error || 'Unable to load clock settings');
  for (const key of timerKeys) timerValues[key] = stored['coolClockLegacy:' + key];
  globalThis.coolClockSettings = response.data.settings;
  globalThis.coolClockLanguage = response.data.settings.language || '';
  await i18n.load();
  loadin();
});

var paused = false;
var time = 0;
var status;

function byId(ele) {
  return document.getElementById(ele);
}
function firstByClass(ele) {
  return document.getElementsByClassName(ele)[0];
}
function firstByTag(ele) {
  return document.getElementsByTagName(ele)[0];
}

function resize_window() {
  var height = document.body.offsetHeight;

  if (window.win_height != undefined) {
    window.resizeTo(400, win_height);
    return false;
  }

  //var frame_height=window.outerHeight-window.innerHeight
  var frame_height = 30;
  //height=height+frame_height
  height = byId('page').offsetHeight + frame_height + 8;

  console.log('Window height resized to ' + height + 'px.');

  window.resizeTo(430, height);
}

function move_window() {
  var left = screen.width / 2 - 430 / 2;
  var top = screen.height / 2 - 250 / 2 - 50;
  window.moveTo(left, top);
}

//Start counting (start)
function start_count() {
  saveTimerValue('timer_timestamp', Date.now());
  saveTimerValue('timer_ori_timestamp', Date.now());
  firstByClass('setting').classList.add('hide');
  firstByClass('counting').classList.remove('hide');

  cal_time();

  resize_window();

  window.status = 'counting';
}

//Calculate time
function cal_time(valueonly) {
  if (timerValues.timer_timestamp == null) {
    return false;
  }
  if (paused == true) {
    return false;
  }

  var ele = byId('p_time');
  var t = timerValues.timer_timestamp;
  var d = Number(new Date());
  if (valueonly) {
    return d - t;
  }
  var content = format(d - t);
  ele.textContent = content;
  window.time = d - t;

  window.status = 'counting';

  setTimeout(cal_time, 10);
}

//Stop counting (Pause)
function stop_count() {
  saveTimerValue('timer_paused_timestamp', Date.now());
  saveTimerValue('timer_quit_msg', window.time);
  window.paused = true;
  //byId("c_button_stop").classList.add("hide");
  byId('c_running').classList.add('hide');
  byId('c_stopped').classList.remove('hide');

  window.status = 'paused';
}

//Restart counting
async function restart_count() {
  await Promise.all(
    [
      'timer_paused_timestamp',
      'timer_timestamp',
      'timer_ori_timestamp',
      'timer_quit_msg',
      'save_split'
    ].map(removeTimerValue)
  );
  location.reload();
}

//Continue counting
function continue_count(once) {
  var t = timerValues.timer_paused_timestamp;
  var d = Number(new Date());
  saveTimerValue(
    'timer_timestamp',
    d - parseInt(timerValues.timer_paused_timestamp, 10) + parseInt(timerValues.timer_timestamp, 10)
  );
  removeTimerValue('timer_paused_timestamp');
  window.paused = false;
  //byId("c_button_stop").classList.remove("hide");
  byId('c_running').classList.remove('hide');
  byId('c_stopped').classList.add('hide');

  cal_time();
}

//Split
function save_split() {
  var data = [];
  if (timerValues.save_split) {
    data = JSON.parse(timerValues.save_split);
  }
  data[data.length] = cal_time(true);
  data = JSON.stringify(data);
  saveTimerValue('save_split', data);

  save_split.view();
}

save_split.view = function () {
  if (!save_split.view.opened) {
    save_split.view.win = window.open('stopwatch_split.html', '_split', 'width=300,height=600');
    save_split.view.win.addEventListener('load', function () {
      save_split.view.win.addEventListener('unload', function () {
        save_split.view.opened = false;
      });
    });
    save_split.view.opened = true;
  } else {
    save_split.view.win.focus();
  }
};
save_split.view.opened = false;

//Load in
function loadin() {
  if (location.hash == '#noti') {
    document.documentElement.id = 'noti';
    byId('stay').checked = true;
    document.querySelectorAll('.option > br').forEach((br) => br.replaceWith(' '));
    setTimeout(function () {
      window.scrollTo(5, 5);
    }, 1);
  }

  //events
  window.addEventListener('resize', resize_window);
  window.addEventListener('beforeunload', quit);
  document.body.addEventListener('contextmenu', function (event) {
    event.preventDefault();
    document.body.style.cursor = 'not-allowed';
    setTimeout(function () {
      document.body.style.cursor = 'default';
    }, 300);
  });

  //Setting page
  byId('s_button_start').addEventListener('click', start_count, false);
  byId('s_button_close').addEventListener(
    'click',
    function () {
      window.close();
    },
    false
  );

  //Counting page
  byId('c_button_stop').addEventListener('click', stop_count, false);
  byId('c_button_split').addEventListener('click', save_split, false);
  byId('c_button_viewsplit').addEventListener('click', save_split.view, false);
  byId('c_button_continue').addEventListener('click', continue_count, false);
  byId('c_button_restart').addEventListener('click', restart_count, false);
  byId('c_button_close').addEventListener(
    'click',
    function () {
      window.close();
    },
    false
  );
  byId('o_units').addEventListener('change', function () {
    saveTimerValue('timer_units', this.checked);
    window.units = this.checked;
  });
  byId('stay').disabled = true;

  //Note
  firstByClass('n_close').addEventListener(
    'click',
    function () {
      firstByClass('note').classList.add('hide');
      resize_window();
    },
    false
  );

  window.status = 'setting';

  if (timerValues.timer_timestamp != null) {
    window.status = 'counting';

    firstByClass('setting').classList.add('hide');
    firstByClass('counting').classList.remove('hide');
    if (timerValues.timer_paused_timestamp != null) {
      window.paused = true;
      //byId("c_button_stop").classList.add("hide");
      byId('c_running').classList.add('hide');
      byId('c_stopped').classList.remove('hide');
      byId('p_time').textContent = format(timerValues.timer_quit_msg);
      window.time = parseInt(timerValues.timer_quit_msg, 10);

      window.status = 'paused';
    }
    cal_time();
    resize_window();
  } else {
    firstByClass('setting').classList.remove('hide');
    firstByClass('counting').classList.add('hide');
  }

  //Logging
  console.group('Log');
  console.log("Note:'undefined' means not set.");
  console.log('  Start time: ' + timerValues.timer_timestamp);
  console.log('  Paused time: ' + timerValues.timer_paused_timestamp);
  console.log('  Quit Msg: ' + timerValues.timer_quit_msg);
  console.log('  Status: "' + window.status + '"');
  console.groupEnd();

  console.groupCollapsed('Other Logs');

  //Status Writer
  setInterval(status_writer, 100);

  //Load in settings
  restore();

  //Translations
  i18n.translate();

  move_window();
  resize_window();
  setInterval(resize_window, 30000);
}

//Restore settings
function restore() {
  byId('o_units').checked = timerValues.timer_units === true || timerValues.timer_units === 'true';
  window.units = byId('o_units').checked;
}

function format(t) {
  var txt = parseInt(t, 10);
  var ms = txt % 1000;
  ms = Math.floor((ms / 1000) * 100);
  //I dont know why it has to +50 and -50.
  if (ms < 50) {
    ms += 50;
  } else if (ms >= 50) {
    ms -= 50;
  }
  txt /= 1000;
  var hour = 0;
  var min = 0;
  var sec = 0;
  for (i = 0; i > -1; i++) {
    if (txt > 3600) {
      txt = txt - 3600;
      hour = hour + 1;
    } else {
      break;
    }
  }
  for (i = 0; i > -1; i++) {
    if (txt > 60) {
      txt = txt - 60;
      min = min + 1;
    } else {
      break;
    }
  }
  sec = txt.toFixed();
  if (sec == 60) {
    sec = 0;
    min = min + 1;
  }
  hour = add_zero(hour);
  min = add_zero(min);
  sec = add_zero(sec);
  ms = add_zero(ms);
  var content = hour + ':' + min + ':' + sec + '.' + ms;
  if (window.units == true) {
    content = content.replace(/:/, 'h ').replace(/:/, 'm ') + 's';
  }

  return content;
}
function add_zero(t) {
  if (t < 10) {
    return '0' + t;
  } else {
    return t;
  }
}

//Write status
function status_writer() {
  var s = window.status,
    t = i18n('timer'),
    b = ' - ' + i18n('extName');

  if (s == 'setting') {
    document.title = t + b;
    firstByTag('h2').textContent = t;
  } else if (s == 'counting') {
    document.title = t + ' - Running' + b;
    firstByTag('h2').textContent = t + ' - Running';
  } else if (s == 'paused') {
    document.title = t + ' - Paused' + b;
    firstByTag('h2').textContent = t + ' - Paused';
  } else {
    document.title = t + b;
    firstByTag('h2').textContent = t;
  }

  byId('c_starttime').textContent = new Date(parseInt(timerValues.timer_ori_timestamp));
  byId('c_starttime').setAttribute('title', new Date(parseInt(timerValues.timer_ori_timestamp)));
}

function quit() {
  if (timerValues.timer_paused_timestamp != null) {
    saveTimerValue('timer_quit_msg', window.time);
  }

  if (save_split.view.opened) {
    save_split.view.win.close();
  }
}
