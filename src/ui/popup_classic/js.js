// Controller for the original 250px popup. The original markup and CSS are bundled unchanged.
const oldApi = globalThis.browser || globalThis.chrome;
let oldState;
let oldPage = 0;
let oldPrefs = {};

function oldOpen(path, width, height) {
  oldApi.windows.create({ url: oldApi.runtime.getURL(path), type: 'popup', width, height });
}

function oldDrawClock(now) {
  const canvas = document.getElementById('a_clock');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 200, 200);
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(100, 100, 90, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    ctx.beginPath();
    ctx.moveTo(100 + Math.sin(a) * 76, 100 - Math.cos(a) * 76);
    ctx.lineTo(100 + Math.sin(a) * 86, 100 - Math.cos(a) * 86);
    ctx.stroke();
  }
  function hand(angle, length, width, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(100, 100);
    ctx.lineTo(100 + Math.sin(angle) * length, 100 - Math.cos(angle) * length);
    ctx.stroke();
  }
  hand((((now.getHours() % 12) + now.getMinutes() / 60) * Math.PI) / 6, 50, 6, '#333');
  hand(((now.getMinutes() + now.getSeconds() / 60) * Math.PI) / 30, 72, 4, '#666');
  hand((now.getSeconds() * Math.PI) / 30, 78, 2, '#c33');
}

function oldUpdate() {
  const systemNow = new Date();
  const settings = oldState?.settings;
  const shift =
    settings?.timezoneEnabled && Number.isFinite(settings.timezone)
      ? (settings.timezone + systemNow.getTimezoneOffset() / 60) * 3600000
      : 0;
  const now = new Date(systemNow.getTime() + shift);
  const hour12 = oldState?.settings.hour12 ?? true;
  document.getElementById('txt').textContent = now.toLocaleTimeString(oldApi.i18n.getUILanguage(), {
    hour12
  });
  document.getElementById('date').textContent = now.getDate();
  document.getElementById('month').textContent = now.toLocaleString(oldApi.i18n.getUILanguage(), {
    month: 'short'
  });
  document.getElementById('year').textContent = now.getFullYear();
  document.getElementById('day').textContent = now.toLocaleString(oldApi.i18n.getUILanguage(), {
    weekday: 'long'
  });
  if (oldPrefs.lunar === 'true') {
    const parts = new Intl.DateTimeFormat('zh-TW-u-ca-chinese', {
      month: 'long',
      day: 'numeric'
    }).formatToParts(now);
    document.getElementById('lunar').textContent =
      `（農曆${parts.find((part) => part.type === 'month')?.value || ''}${parts.find((part) => part.type === 'day')?.value || ''}）`;
  } else document.getElementById('lunar').textContent = '';
  if (oldState?.countdowns.length) {
    const timer = oldState.countdowns.reduce((a, b) => (a.end < b.end ? a : b));
    const seconds = Math.max(0, Math.ceil((timer.end - Date.now()) / 1000));
    document.getElementById('cdremain').textContent =
      `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    document.getElementById('cdprogress').style.width =
      `${Math.max(0, ((seconds * 1000) / timer.duration) * 100)}%`;
    document.getElementById('cdremaindiv').style.display = '';
  } else document.getElementById('cdremaindiv').style.display = 'none';
  oldDrawClock(now);
}

function oldShow(page) {
  oldPage = (page + 3) % 3;
  for (const [index, id] of ['time', 'clock', 'calendar'].entries()) {
    const node = document.getElementById(id);
    node.style.display = index === oldPage ? 'block' : 'none';
    node.style.left = index === oldPage ? '0px' : index < oldPage ? '-350px' : '350px';
  }
}

async function oldInit() {
  const result = await oldApi.runtime.sendMessage({ target: 'worker', type: 'get' });
  if (!result?.ok) throw Error(result?.error || 'Clock unavailable');
  oldState = result.data;
  globalThis.coolClockLanguage = oldState.settings.language || '';
  globalThis.coolClockSettings = oldState.settings;
  const keys = ['lunar', 'dateorder', 'flipclock', 'mini'].map((key) => 'coolClockLegacy:' + key);
  const local = await oldApi.storage.local.get(keys);
  let synced = {};
  if (oldState.settings.syncEnabled !== false) {
    try {
      synced = await oldApi.storage.sync.get(keys.slice(0, 2));
    } catch (error) {
      console.warn('Cool Clock: option sync unavailable', error);
    }
  }
  for (const key of ['lunar', 'dateorder', 'flipclock', 'mini']) {
    oldPrefs[key] = synced['coolClockLegacy:' + key] ?? local['coolClockLegacy:' + key];
  }
  document.querySelectorAll('[trans]').forEach((node) => {
    node.textContent = t(node.getAttribute('trans'));
  });
  document.getElementById('version').append(' ' + oldApi.runtime.getManifest().version);
  document.getElementById('startupblocker').style.display = 'none';
  try {
    const order = Object.values(JSON.parse(oldPrefs.dateorder || '{}'));
    if (order.length === 3 && ['Year', 'Month', 'Date'].every((part) => order.includes(part))) {
      const container = document.getElementById('datespace');
      container.replaceChildren(document.createTextNode('　'));
      order.forEach((part, index) => {
        if (index) container.append(document.createTextNode(','));
        const label = document.createElement('span');
        label.id = { Year: 'year', Month: 'month', Date: 'date' }[part];
        if (part === 'Date') label.style.fontSize = '1.3em';
        container.append(label);
      });
    }
  } catch (error) {
    console.warn('Cool Clock date order:', error);
  }
  oldShow(0);
  oldUpdate();
  setInterval(oldUpdate, 1000);
  document.getElementById('flipbtn').checked = oldPrefs.flipclock !== 'false';
  const setFlip = () => {
    const flip = document.getElementById('flipbtn').checked;
    document.getElementById('flipclock').style.display = flip ? '' : 'none';
    document.getElementById('noflipclock').style.display = flip ? 'none' : '';
    oldPrefs.flipclock = String(flip);
    oldApi.storage.local.set({ 'coolClockLegacy:flipclock': oldPrefs.flipclock });
  };
  document.getElementById('flipbtn').addEventListener('change', setFlip);
  setFlip();
  document.getElementById('to_left').addEventListener('click', () => oldShow(oldPage - 1));
  document.getElementById('to_right').addEventListener('click', () => oldShow(oldPage + 1));
  document.getElementById('toggleSize').addEventListener('click', () => {
    const mini = document.documentElement.classList.toggle('mini');
    oldPrefs.mini = String(mini);
    oldApi.storage.local.set({ 'coolClockLegacy:mini': oldPrefs.mini });
  });
  if (oldPrefs.mini === 'true') document.documentElement.classList.add('mini');
  document
    .getElementById('alarmbtn')
    .addEventListener('click', () => oldOpen('alarm_interface.html', 785, 490));
  document
    .getElementById('viewsavedalarmbtn')
    .addEventListener('click', () => oldOpen('alarm_interface.html', 785, 490));
  document
    .getElementById('countdownbtn')
    .addEventListener('click', () => oldOpen('countdown_interface.html', 700, 450));
  document
    .getElementById('cdremaindiv')
    .addEventListener('click', () => oldOpen('countdown_interface.html', 700, 450));
  document
    .getElementById('timerbtn')
    .addEventListener('click', () => oldOpen('timer.html', 500, 200));
  document
    .getElementById('info')
    .addEventListener('click', () =>
      oldApi.tabs.create({ url: oldApi.runtime.getURL('statistics.html') })
    );
  document.getElementById('helpbtn').addEventListener('click', () =>
    oldApi.tabs.create({
      url: 'https://docs.google.com/document/d/1BhBnW1-mzGExFMwz7RtccqRGV6tvnzA1D7ZnyTqf5A8/pub'
    })
  );
  document
    .getElementById('fb')
    .addEventListener('click', () =>
      oldApi.tabs.create({ url: 'https://www.facebook.com/coolclock' })
    );
  document
    .querySelector('.calendar_btn')
    .addEventListener('click', () =>
      oldApi.tabs.create({ url: oldApi.runtime.getURL('calendar_full.html') })
    );
}
oldInit().catch((error) => {
  console.error(error);
  document.getElementById('startupblocker').style.display = 'none';
});
