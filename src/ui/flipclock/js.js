document.addEventListener('DOMContentLoaded', async function () {
  const api = globalThis.browser || globalThis.chrome;
  const result = await api.runtime.sendMessage({ target: 'worker', type: 'get' });
  if (!result?.ok) throw Error(result?.error || 'Unable to load clock settings');
  globalThis.coolClockSettings = result.data.settings;
  globalThis.coolClockLanguage = result.data.settings.language || '';
  await i18n.load();
  //AM or PM
  if (globalThis.coolClockSettings.hour12) {
    var ele = document.getElementsByClassName('apm')[0];
    ele.style.opacity = 1;
    ele.textContent = pmam().toUpperCase();
  }

  const scale = new URLSearchParams(location.search).get('scale');
  const [scaleX, scaleY] = (scale || '').trim().split(/\s+/).map(Number);
  if (scale && Number.isFinite(scaleX) && Number.isFinite(scaleY) && scaleX > 0 && scaleY > 0) {
    document.body.style.transformOrigin = '0 0';
    document.body.style.transform = `scale(${scaleX}, ${scaleY})`;
  }

  //check if in popup
  if (self != top) {
    var onscroll = function () {
      window.scrollTo(0, 0);
    };
    document.getElementById('nopopup').style.display = 'none';
  }

  //check if not in popup
  if (self === top) {
    document.body.style.overflowX = 'visible';
    if (scale && Number.isFinite(scaleX) && scaleX > 0) {
      document.getElementsByTagName('input')[0].value = Math.floor(scaleX * 100);
    }
  }
  ctrl();
  setInterval(ctrl, 1000);
  if (onscroll) document.body.addEventListener('scroll', onscroll);
  document.body.addEventListener('contextmenu', function (event) {
    event.preventDefault();
  });

  onscroll && onscroll();

  //events
  document.querySelectorAll("input[type='number']").forEach((input) => {
    input.addEventListener('mouseup', function () {
      location.href = 'flipclock.html?scale=' + this.value / 100 + ' ' + this.value / 100;
    });
    input.addEventListener('blur', function () {
      this.focus();
    });
    input.addEventListener('keydown', function (event) {
      event.preventDefault();
    });
  });
});

function flip(mode) {
  var d = new Date().applyTZ();
  if (mode == 'sec') {
    //var sec=new Date().getSeconds()
    var sec = d.getSeconds();
    sec = (sec + '').length < 2 ? '0' + sec : sec;
  }
  if (mode == 'min') {
    //var sec=new Date().getMinutes()
    var sec = d.getMinutes();
    sec = (sec + '').length < 2 ? '0' + sec : sec;
  }
  if (mode == 'hour') {
    //var sec=new Date().getHours()
    var sec = d.getHours();
    if (globalThis.coolClockSettings.hour12) {
      if (sec > 12) {
        sec -= 12;
      } else if (sec == 0) {
        sec = 12;
      }
    }
    sec = (sec + '').length < 2 ? '0' + sec : sec;
  }

  document.getElementById(mode + 'front').getElementsByTagName('div')[0].innerText = sec;
  document.getElementById(mode + 'front').style.display = 'block';
  document.getElementById(mode + 'front').style.top = '0px';
  document.getElementById(mode + 'front').style.height = '50px';
  document.getElementById(mode + 'up').getElementsByTagName('div')[0].innerText = sec;
  setTimeout(function () {
    document.getElementById(mode + 'front').style.height = '0';
    document.getElementById(mode + 'front').style.top = '51px';
    document.getElementById(mode + 'front').getElementsByTagName('div')[0].style.top = '-37px';
    setTimeout(function () {
      document.getElementById(mode + 'front').style.height = '50px';
      document.getElementById(mode + 'down').getElementsByTagName('div')[0].innerText = sec;
      setTimeout(function () {
        document.getElementById(mode + 'front').style.display = 'none';
      }, 100);
    }, 100);
  }, 0);
}

function ctrl() {
  var d = new Date();
  d.applyTZ();

  flip('sec');
  if (window.min != d.getMinutes()) {
    flip('min');
  }
  if (window.hour != d.getHours()) {
    flip('hour');
  }

  window.min = d.getMinutes();
  window.hour = d.getHours();
}
