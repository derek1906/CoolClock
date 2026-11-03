// Keep the original popup markup and styling while replacing Custom Elements v0.
var popupApi = globalThis.browser || globalThis.chrome;
var popupState;
var popupStopwatch = {};

function popupNow() {
  const settings = popupState?.settings;
  const now = new Date();
  const shift =
    settings?.timezoneEnabled && Number.isFinite(settings.timezone)
      ? (settings.timezone + now.getTimezoneOffset() / 60) * 3600000
      : 0;
  return new Date(now.getTime() + shift);
}

function templateFor(host, name) {
  const template = document.getElementById(name);
  const fragment = template.content.cloneNode(true);
  const root = host.attachShadow({ mode: 'open' });
  root.append(fragment);
  return root;
}

class BackgroundShapes extends HTMLElement {
  connectedCallback() {
    const root = templateFor(this, 'background-shapes');
    const canvas = document.createElement('canvas');
    const popupWidth = document.body.clientWidth;
    canvas.width = popupWidth;
    canvas.height = 500;
    root.append(canvas);
    const ctx = canvas.getContext('2d');
    const points = Array.from({ length: 50 }, () => ({
      x: Math.random() * popupWidth,
      y: Math.random() * 500,
      radius: Math.random() * 20,
      alpha: Math.random() * 0.05,
      dy: Math.random() * 0.25 - 0.125
    }));
    let previous;
    const draw = (timestamp) => {
      if (!this.isConnected) return;
      ctx.clearRect(0, 0, popupWidth, 500);
      for (const point of points) {
        ctx.fillStyle = `rgba(255,255,255,${point.alpha})`;
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
        ctx.fill();
        point.x += ((timestamp - (previous ?? timestamp)) / (1000 / 60)) * (point.radius / 50);
        point.y += ((timestamp - (previous ?? timestamp)) / (1000 / 60)) * point.dy;
        if (point.x > popupWidth + point.radius * 2) point.x = -point.radius * 2;
      }
      previous = timestamp;
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }
}

class TitleClock extends HTMLElement {
  connectedCallback() {
    const root = templateFor(this, 'title-clock');
    root
      .getElementById('hours-minutes')
      .addEventListener('click', () =>
        root.getElementById('clockface').classList.toggle('alwaysShowSeconds')
      );
    const update = () => {
      const now = popupNow();
      const hour12 = popupState?.settings.hour12;
      const hours = hour12 ? now.getHours() % 12 || 12 : now.getHours();
      root.getElementById('hours').textContent = String(hours).padStart(2, '0');
      root.getElementById('minutes').textContent = String(now.getMinutes()).padStart(2, '0');
      root.getElementById('seconds').textContent = String(now.getSeconds()).padStart(2, '0');
      if (hour12)
        root.getElementById('hours-minutes').dataset.pmLabel =
          now.getHours() < 12 ? t('am') : t('pm');
      else root.getElementById('hours-minutes').removeAttribute('data-pm-label');
    };
    this.update = update;
    update();
    this.timer = setInterval(update, 1000);
  }
  disconnectedCallback() {
    clearInterval(this.timer);
  }
}

class TitleDate extends HTMLElement {
  connectedCallback() {
    const root = templateFor(this, 'title-date');
    const update = () => {
      root.getElementById('content').textContent = popupNow().toLocaleDateString(
        popupState?.settings.language || popupApi.i18n.getUILanguage(),
        { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
      );
    };
    this.update = update;
    update();
    this.timer = setInterval(update, 60_000);
  }
  disconnectedCallback() {
    clearInterval(this.timer);
  }
}

class TitleWeather extends HTMLElement {
  connectedCallback() {
    templateFor(this, 'title-weather');
  }
  async update(location) {
    const root = this.shadowRoot;
    const wrapper = root.getElementById('wrapper');
    wrapper.classList.remove('loaded', 'success');
    if (!location) return;
    root.getElementById('loading-status').textContent = t('weatherLoading');
    try {
      location = await resolveWeatherLocation(location, popupApi);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(location.latitude)}&longitude=${encodeURIComponent(location.longitude)}&current=temperature_2m,relative_humidity_2m,weather_code`;
      const response = await fetch(url);
      if (!response.ok) throw Error(String(response.status));
      const data = await response.json();
      const celsius = Number(data.current?.temperature_2m);
      if (!Number.isFinite(celsius)) throw Error('Weather data unavailable');
      const descriptions = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Cloudy',
        45: 'Fog',
        48: 'Fog',
        51: 'Drizzle',
        53: 'Drizzle',
        55: 'Drizzle',
        56: 'Freezing drizzle',
        57: 'Freezing drizzle',
        61: 'Rain',
        63: 'Rain',
        65: 'Heavy rain',
        66: 'Freezing rain',
        67: 'Freezing rain',
        71: 'Snow',
        73: 'Snow',
        75: 'Heavy snow',
        77: 'Snow grains',
        80: 'Rain showers',
        81: 'Rain showers',
        82: 'Heavy rain showers',
        85: 'Snow showers',
        86: 'Snow showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm',
        99: 'Thunderstorm'
      };
      const temperature =
        location.unit === 'fahrenheit'
          ? `${Math.round((celsius * 9) / 5 + 32)}°F`
          : `${Math.round(celsius)}°C`;
      const humidity = data.current?.relative_humidity_2m;
      const humidityText =
        typeof humidity === 'number' && Number.isFinite(humidity)
          ? ` · ${t('weatherHumidity')} ${Math.round(humidity)}%`
          : '';
      root.getElementById('city').textContent = location.name;
      root.getElementById('condition').textContent =
        `${temperature}, ${descriptions[data.current.weather_code] || 'Weather'}${humidityText}`;
      wrapper.classList.add('loaded', 'success');
      this.onclick = () =>
        popupApi.tabs.create({ url: popupApi.runtime.getURL('mv3/weather_details.html') });
    } catch {
      root.getElementById('city').textContent = t('weatherUnavailable');
      root.getElementById('condition').textContent = '';
      wrapper.classList.add('loaded');
    }
  }
}

class AppList extends HTMLElement {
  connectedCallback() {
    const root = templateFor(this, 'app-list');
    const style = document.createElement('style');
    style.textContent =
      '::slotted(app-list-item){display:block;height:42px}::slotted(app-list-item:hover){opacity:1}';
    root.append(style);
  }
}

class AppListItem extends HTMLElement {
  static get observedAttributes() {
    return ['center', 'label', 'message'];
  }
  connectedCallback() {
    const root = templateFor(this, 'app-list-item');
    for (const name of AppListItem.observedAttributes)
      this.attributeChangedCallback(name, null, this.getAttribute(name));
  }
  attributeChangedCallback(name, _oldValue, value) {
    if (!this.shadowRoot) return;
    const item = this.shadowRoot.getElementById('list-item');
    if (name === 'center') item.classList.toggle('center', value !== null);
    if (name === 'label')
      value == null ? item.removeAttribute('data-label') : item.setAttribute('data-label', value);
    if (name === 'message') this.shadowRoot.getElementById('message').textContent = value || '';
  }
}

customElements.define('background-shapes', BackgroundShapes);
customElements.define('title-clock', TitleClock);
customElements.define('title-date', TitleDate);
customElements.define('title-weather', TitleWeather);
customElements.define('app-list', AppList);
customElements.define('app-list-item', AppListItem);

const item = (id) => document.getElementById(id);
const targetUrl = (path) => popupApi.runtime.getURL(path);
async function request(type, payload = {}) {
  const result = await popupApi.runtime.sendMessage({ target: 'worker', type, ...payload });
  if (!result?.ok) throw Error(result?.error || t('errorUnavailable'));
  return result.data;
}
async function openWindow(path, width, height) {
  await popupApi.windows.create({ url: targetUrl(path), type: 'popup', width, height });
}
function formatRemaining(milliseconds) {
  const total = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(total / 3600);
  return `${hours ? `${hours}:` : ''}${String(Math.floor(total / 60) % 60).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
function updateStatuses() {
  if (!popupState) return;
  const alarms = popupState.alarms.filter((alarm) => alarm.enabled);
  const shift = popupNow().getTime() - Date.now();
  const nextAlarm = alarms
    .map((alarm) => {
      for (let offset = 0; offset <= 7; offset++) {
        const now = popupNow();
        const date = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + offset,
          alarm.hour,
          alarm.minute
        );
        if (
          date.getTime() - shift > Date.now() &&
          (!alarm.days.length || alarm.days.includes(date.getDay()))
        )
          return date;
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => a - b)[0];
  item('alarm-status').setAttribute(
    'message',
    nextAlarm
      ? `Next alarm at ${nextAlarm.toLocaleTimeString(popupState.settings.language || popupApi.i18n.getUILanguage(), { hour: 'numeric', minute: '2-digit' })}`
      : 'Set a new alarm'
  );
  if (alarms.length) item('alarm-status').setAttribute('label', String(alarms.length));
  else item('alarm-status').removeAttribute('label');

  const timers = popupState.countdowns;
  item('countdown-status').setAttribute(
    'message',
    timers.length
      ? `Remaining: ${formatRemaining(Math.min(...timers.map((timer) => timer.end)) - Date.now())}`
      : 'Set a countdown timer'
  );
  if (timers.length) item('countdown-status').setAttribute('label', String(timers.length));
  else item('countdown-status').removeAttribute('label');

  const stopwatchStart = Number(popupStopwatch['coolClockLegacy:timer_timestamp']);
  const stopwatchPaused = Number(popupStopwatch['coolClockLegacy:timer_paused_timestamp']);
  const running = Number.isFinite(stopwatchStart) && stopwatchStart > 0;
  const stopwatchTime = running ? (stopwatchPaused || Date.now()) - stopwatchStart : 0;
  item('stopwatch-status').setAttribute(
    'message',
    running
      ? `Timer: ${(stopwatchTime / 1000).toFixed(stopwatchPaused ? 2 : 0)}s`
      : 'Start stopwatch'
  );
  if (running) item('stopwatch-status').setAttribute('label', '1');
  else item('stopwatch-status').removeAttribute('label');

  const now = new Date();
  const today = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const todos = popupState.todos[today] || [];
  item('calendar-status').setAttribute(
    'message',
    todos.length ? `${todos.length} events: "${todos[0].text}"` : 'Set todos in Calendar'
  );
  if (todos.length) item('calendar-status').setAttribute('label', String(todos.length));
  else item('calendar-status').removeAttribute('label');
}

async function initPopup() {
  try {
    [popupState, popupStopwatch] = await Promise.all([
      request('get'),
      popupApi.storage.local.get([
        'coolClockLegacy:timer_timestamp',
        'coolClockLegacy:timer_paused_timestamp'
      ])
    ]);
    globalThis.coolClockLanguage = popupState.settings.language || '';
    document.documentElement.lang = popupState.settings.language || popupApi.i18n.getUILanguage();
    document.querySelectorAll('[trans]').forEach((node) => {
      node.textContent = t(node.getAttribute('trans'));
    });
    updateStatuses();
    item('title').querySelector('title-clock').update();
    item('title').querySelector('title-date').update();
    await item('title').querySelector('title-weather').update(popupState.settings.weather);
  } catch (error) {
    item('alarm-status').setAttribute('message', error.message);
  }
  setInterval(updateStatuses, 1000);
  popupApi.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    for (const key of [
      'coolClockLegacy:timer_timestamp',
      'coolClockLegacy:timer_paused_timestamp'
    ]) {
      if (!Object.hasOwn(changes, key)) continue;
      if (changes[key].newValue === undefined) delete popupStopwatch[key];
      else popupStopwatch[key] = changes[key].newValue;
    }
    updateStatuses();
  });
  setInterval(async () => {
    try {
      popupState = await request('get');
      await item('title').querySelector('title-weather').update(popupState.settings.weather);
    } catch (error) {
      console.warn('Cool Clock: unable to refresh popup weather', error);
    }
  }, 300000);
  item('alarm-status').addEventListener('click', () =>
    openWindow('alarm_interface.html', 785, 490)
  );
  item('countdown-status').addEventListener('click', () =>
    openWindow('countdown_interface.html', 700, 450)
  );
  item('stopwatch-status').addEventListener('click', () => openWindow('timer.html', 500, 200));
  item('calendar-status').addEventListener('click', () =>
    popupApi.tabs.create({ url: targetUrl('calendar_full.html') })
  );
  item('app-more').addEventListener('click', () =>
    item('bottom-sheet-wrapper').classList.toggle('hidden')
  );
  item('bottom-sheet-backdrop').addEventListener('click', () =>
    item('bottom-sheet-wrapper').classList.add('hidden')
  );
  item('action-statistics').addEventListener('click', () =>
    popupApi.tabs.create({ url: targetUrl('statistics.html') })
  );
  item('action-settings').addEventListener('click', () => popupApi.runtime.openOptionsPage());
  item('action-help').addEventListener('click', () =>
    popupApi.tabs.create({
      url: 'https://docs.google.com/document/d/1BhBnW1-mzGExFMwz7RtccqRGV6tvnzA1D7ZnyTqf5A8/pub'
    })
  );
  item('action-forum').addEventListener('click', () =>
    popupApi.tabs.create({ url: 'https://groups.google.com/forum/#!forum/chrome-clock' })
  );
  item('action-about').addEventListener('click', () =>
    popupApi.tabs.create({ url: targetUrl('about.html') })
  );
}
initPopup().catch((error) => console.error('Cool Clock popup:', error));
