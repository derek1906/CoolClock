// Adapter for the original alarm and countdown windows. Their markup and UI code
// stay intact; persistent alarms and notifications live in the MV3 background.
var legacyApi = globalThis.browser || globalThis.chrome;
var clockState;
var alarmModels = [];
var timerModels = [];
var pageValues = {};

function sendLegacy(type, values = {}) {
  return legacyApi.runtime
    .sendMessage({ target: 'worker', type, ...values })
    .then((result) => {
      if (!result?.ok) throw Error(result?.error || type);
      return result.data;
    })
    .catch((error) => {
      console.error('Cool Clock:', error);
    });
}

function legacyClockShift() {
  return clockState?.settings.timezoneEnabled && Number.isFinite(clockState.settings.timezone)
    ? (clockState.settings.timezone + new Date().getTimezoneOffset() / 60) * 3600000
    : 0;
}

class AlarmModel {
  constructor(entry) {
    this.id = entry.id;
    this.hour = entry.hour;
    this.min = entry.minute;
    this.day = entry.days.slice();
    this.type = this.day.length ? 's' : 'o';
    this.text = entry.message;
    this.off = !entry.enabled;
  }
  set(name, value) {
    const changes = typeof name === 'string' ? { [name]: value } : name;
    Object.assign(this, changes);
    sendLegacy('update-alarm', {
      id: this.id,
      hour: this.hour,
      minute: this.min,
      days: this.day,
      text: this.text,
      enabled: !this.off
    });
  }
  getNextScheduledTime() {
    if (this.off) return null;
    const shift = legacyClockShift();
    const now = new Date(Date.now() + shift);
    for (let offset = 0; offset <= 7; offset++) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + offset,
        this.hour,
        this.min
      );
      if (date.getTime() - shift <= Date.now()) continue;
      if (this.day.length && !this.day.includes(date.getDay())) continue;
      return {
        emulated: date,
        source: new Date(date.getTime() - shift),
        timeString: () => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      };
    }
    return null;
  }
}

class CountdownModel {
  constructor(entry) {
    Object.assign(this, entry);
    this.start ||= this.end - this.duration;
    this.color ||= 'primary';
  }
  set(name, value) {
    const changes = typeof name === 'string' ? { [name]: value } : name;
    Object.assign(this, changes);
    sendLegacy('update-timer', { id: this.id, repeat: this.repeat, color: this.color });
  }
  getRemainingString() {
    const seconds = Math.max(0, Math.ceil((this.end - Date.now()) / 1000));
    return `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
}

var LegacyBackground = {
  Functions: {
    time() {
      return {
        getCalendar(_calendar, date = new Date()) {
          const midday = new Date(
            Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12)
          );
          const parts = new Intl.DateTimeFormat('zh-TW-u-ca-chinese', {
            timeZone: 'Asia/Shanghai',
            month: 'long',
            day: 'numeric'
          }).formatToParts(midday);
          const month = parts.find((part) => part.type === 'month')?.value || '';
          const day = parts.find((part) => part.type === 'day')?.value || '';
          return `農曆${month}${day}`;
        }
      };
    }
  },
  Components: {
    getSingleton(name) {
      if (name === 'AlarmClock') return LegacyBackground.AlarmClock;
      if (name === 'CountdownTimer') return LegacyBackground.CountdownTimer;
      if (name === 'WindowManager') return { registerOnClose() {} };
      if (name === 'BrowserActionHandler')
        return {
          updateIcon() {
            syncLegacyOption('clockDefinition');
          },
          updatePopup() {
            syncLegacyOption('popup_version');
          }
        };
      if (name === 'HourlyTimeAnnouncementHandler')
        return {
          displayNotification() {
            sendLegacy('test-hourly');
          }
        };
      if (name === 'Localization') return null;
      throw Error(`Legacy component unavailable: ${name}`);
    }
  },
  AlarmClock: {
    getAll: () => alarmModels.slice(),
    getActiveAlarms: () => alarmModels.filter((alarm) => !alarm.off),
    create(hour, minute, options = {}) {
      const model = new AlarmModel({
        id: crypto.randomUUID(),
        hour,
        minute,
        days: options.day || [],
        message: options.text || '',
        enabled: true
      });
      alarmModels.push(model);
      sendLegacy('add-alarm', { id: model.id, hour, minute, days: model.day, text: model.text });
      return model;
    },
    remove(id) {
      alarmModels = alarmModels.filter((alarm) => alarm.id !== id);
      sendLegacy('remove-alarm', { id });
    },
    removeAll() {
      alarmModels = [];
      sendLegacy('remove-all-alarms');
    }
  },
  CountdownTimer: {
    getAll: () => timerModels.slice(),
    get: (id) => timerModels.find((timer) => timer.id === id),
    getNextScheduledTimer: () => timerModels.slice().sort((a, b) => a.end - b.end)[0],
    create(end, options = {}) {
      const start = Date.now();
      const model = new CountdownModel({
        id: crypto.randomUUID(),
        start,
        end,
        duration: end - start,
        color: options.color || 'primary',
        repeat: !!options.repeat,
        message: options.message || ''
      });
      timerModels.push(model);
      sendLegacy('add-timer', {
        id: model.id,
        seconds: Math.ceil(model.duration / 1000),
        color: model.color,
        repeat: model.repeat,
        text: model.message
      });
      return model;
    },
    remove(id) {
      timerModels = timerModels.filter((timer) => timer.id !== id);
      sendLegacy('remove-timer', { id });
    },
    removeAll() {
      timerModels = [];
      sendLegacy('remove-all-timers');
    }
  },
  createNoti(options) {
    return legacyApi.notifications.create(`coolclock:hint:${crypto.randomUUID()}`, {
      type: 'basic',
      iconUrl: legacyApi.runtime.getURL('n_icon.png'),
      title: options.title || 'Cool Clock',
      message: options.message || ' '
    });
  }
};

(async () => {
  const result = await legacyApi.runtime.sendMessage({ target: 'worker', type: 'get' });
  if (!result?.ok) throw Error(result?.error || 'Unable to load clock data');
  clockState = result.data;
  globalThis.coolClockSettings = clockState.settings;
  globalThis.coolClockLanguage = clockState.settings.language || '';
  await i18n.load();
  alarmModels = clockState.alarms.map((entry) => new AlarmModel(entry));
  timerModels = clockState.countdowns.map((entry) => new CountdownModel(entry));
  const page = location.pathname.split('/').pop();
  if (page === 'calendar_full.html' || page === 'options.html') {
    const extraKeys = [
      'dateorder',
      'lunar',
      'voice',
      'shownotificationtodo',
      'timeupdateicon',
      'showupdate',
      'bg_run',
      'use_dark_mode'
    ];
    const storageKeys = extraKeys.map((key) => 'coolClockLegacy:' + key);
    const local = await legacyApi.storage.local.get(storageKeys);
    let remote = {};
    if (clockState.settings.syncEnabled !== false) {
      try {
        remote = await legacyApi.storage.sync.get(storageKeys);
      } catch (error) {
        console.warn('Cool Clock: option sync unavailable', error);
      }
    }
    for (const key of extraKeys) {
      pageValues[key] = remote['coolClockLegacy:' + key] ?? local['coolClockLegacy:' + key];
    }
    if (Object.keys(remote).length) await legacyApi.storage.local.set(remote);
  }
  globalThis.optionValues = pageValues;
  globalThis.calendarPrefs = pageValues;
  if (page === 'options.html') {
    const saved = clockState.settings;
    const tracked = {
      pm: String(saved.hour12),
      use_digit: String(saved.digital),
      ringtone: saved.ringtone || 'default',
      ring_loop: String(saved.ringLoop ?? false),
      shownotification: String(saved.hourlyEnabled ?? true),
      shownotificationtime: String(saved.hourlyDuration ?? 7),
      noti_voice: JSON.stringify({
        enabled: saved.hourlyVoice ?? false,
        text: saved.hourlyVoiceText || 'It is %h %P.'
      }),
      noti_sound: saved.hourlySound || 'none',
      noti_style: saved.hourlyStyle || 'default',
      noti_bgColor: saved.hourlyBgColor || '#0772a1',
      manuallyclosenoti: String(saved.hourlyManualClose ?? false),
      badge: String(saved.badge ?? false),
      icon: String(saved.icon ?? true),
      show: String(saved.badgeStatic ?? false),
      badge_color: saved.badgeColor || '#428bca',
      clockcolor_value: saved.clockColor || '#000000',
      popup_version: saved.popupVersion || '1',
      context_menu_item_enable: String(saved.contextMenuEnabled ?? true),
      enabletimezone: String(saved.timezoneEnabled ?? false),
      timezone: String(saved.timezone ?? -new Date().getTimezoneOffset() / 60),
      keepawake: String(saved.keepAwake ?? true)
    };
    if (saved.language) tracked.language = saved.language;
    if (saved.weather)
      tracked.weather = JSON.stringify({
        enabled: true,
        name: saved.weather.name,
        latitude: saved.weather.latitude,
        longitude: saved.weather.longitude,
        woeid:
          saved.weather.mode === 'device' &&
          Number.isFinite(saved.weather.latitude) &&
          Number.isFinite(saved.weather.longitude)
            ? `${saved.weather.latitude.toFixed(3)}, ${saved.weather.longitude.toFixed(3)}`
            : '',
        mode: saved.weather.mode === 'device' ? 'device' : 'manual',
        unit: saved.weather.unit === 'fahrenheit' ? 'fahrenheit' : 'celsius'
      });
    if (saved.clockDefinition) tracked.clockDefinition = JSON.stringify(saved.clockDefinition);
    Object.assign(pageValues, tracked);
    const defaults = {
      voice: '{"voiceName":"native","speed":0.7}',
      dateorder: '{"1":"Date","2":"Month","3":"Year"}',
      weather: '{"enabled":false,"woeid":"2459115","name":""}',
      noti_voice: '{"enabled":false,"text":"It is %h %P."}',
      clockDefinition: JSON.stringify({
        analog: {
          width: 19,
          height: 19,
          minY: 0.1,
          hrY: 0.3,
          minColor: '#A7A7A7',
          hrColor: '#808080',
          strokeWidth: 5,
          flatTip: true,
          circleBorder: false,
          circleBorderWidth: 0,
          circleBorderColor: '#6E6E6E',
          background: 'transparent',
          clockBg: 'transparent',
          notificationBg: true,
          indicationLines: true
        },
        digital: {
          width: 19,
          height: 19,
          minXY: [8, 32],
          hrXY: [0, 15],
          font: 'default',
          hrFontSize: 20,
          minFontSize: 16
        }
      }),
      ringtone: 'default',
      noti_sound: 'none',
      ring_loop: 'false',
      use_digit: String(clockState.settings.digital),
      pm: String(clockState.settings.hour12),
      noti_style: 'default',
      context_menu_item_enable: 'true',
      popup_version: '1',
      language: legacyApi.i18n.getUILanguage(),
      shownotification: String(clockState.settings.hourlyEnabled ?? true),
      shownotificationtime: String(clockState.settings.hourlyDuration ?? 7),
      badge: String(clockState.settings.badge ?? false),
      icon: String(clockState.settings.icon ?? true),
      show: String(clockState.settings.badgeStatic ?? false),
      badge_color: clockState.settings.badgeColor || '#428bca',
      clockcolor_value: clockState.settings.clockColor || '#000000',
      manuallyclosenoti: String(clockState.settings.hourlyManualClose ?? false)
    };
    for (const [key, value] of Object.entries(defaults)) pageValues[key] ??= value;
    if (!globalThis.chrome.tts)
      globalThis.chrome.tts = {
        getVoices(callback) {
          callback([]);
        },
        speak() {},
        stop() {}
      };
  }
  const script = document.createElement('script');
  script.src =
    page === 'alarm_interface.html'
      ? '/mv3/original_alarm.js'
      : page === 'calendar_full.html'
        ? '/mv3/original_calendar.js'
        : page === 'options.html'
          ? '/mv3/original_options.js'
          : '/mv3/original_countdown.js';
  document.head.append(script);
})().catch((error) => {
  document.body.textContent = error.message;
  console.error(error);
});

function restoreLegacyCountdownPreset() {
  if (!clockState?.settings.timerPresetSaved) return;
  const preset = clockState.settings.timerPreset;
  const seconds = Number(preset.seconds) || 0;
  document.getElementById('h').value = Math.floor(seconds / 3600);
  document.getElementById('m').value = Math.floor(seconds / 60) % 60;
  document.getElementById('s').value = seconds % 60;
  document.getElementById('message').value = preset.text || '';
  document.getElementById('set').disabled = seconds <= 0;
  const repeat = document.getElementById('repeat');
  repeat.dataset.value = String(!!preset.repeat);
  repeat.classList.toggle('active', !!preset.repeat);
  if (preset.color) {
    document.querySelectorAll('.input-color button').forEach((button) => {
      button.classList.toggle('active', button.value === preset.color);
    });
  }
}

async function syncLegacyOption(key) {
  const source = globalThis.optionValues;
  const voice = (() => {
    try {
      return JSON.parse(source.noti_voice || '{}');
    } catch {
      return {};
    }
  })();
  const definition = (() => {
    try {
      return JSON.parse(source.clockDefinition || '{}');
    } catch {
      return {};
    }
  })();
  const weather = (() => {
    try {
      return JSON.parse(source.weather || '{}');
    } catch {
      return {};
    }
  })();
  const settings = {
    hour12: source.pm === 'true',
    digital: source.use_digit !== 'false',
    ringtone: source.ringtone,
    ringLoop: source.ring_loop === 'true',
    hourlyEnabled: source.shownotification !== 'false',
    hourlyDuration: Number(source.shownotificationtime || 7),
    hourlyVoice: voice.enabled === true,
    hourlyVoiceText: voice.text || 'It is %h %P.',
    hourlySound: source.noti_sound || 'none',
    hourlyStyle: source.noti_style || 'default',
    hourlyBgColor: source.noti_bgColor || '#0772a1',
    hourlyManualClose: source.manuallyclosenoti === 'true',
    badge: source.badge === 'true',
    icon: source.icon !== 'false',
    badgeStatic: source.show === 'true',
    badgeColor: source.badge_color || '#428bca',
    clockColor: source.clockcolor_value || '#000000',
    clockDefinition: definition,
    popupVersion: source.popup_version || '1',
    contextMenuEnabled: source.context_menu_item_enable !== 'false',
    timezoneEnabled: source.enabletimezone === 'true',
    timezone: Number(source.timezone),
    keepAwake: source.keepawake !== 'false',
    language: source.language || legacyApi.i18n.getUILanguage(),
    weather:
      weather.enabled &&
      (weather.mode === 'device' ||
        (Number.isFinite(weather.latitude) && Number.isFinite(weather.longitude)))
        ? {
            name: weather.name || '',
            latitude: weather.latitude,
            longitude: weather.longitude,
            mode: weather.mode === 'device' ? 'device' : 'manual',
            unit: weather.unit === 'fahrenheit' ? 'fahrenheit' : 'celsius'
          }
        : null
  };
  const fieldsByKey = {
    pm: ['hour12'],
    use_digit: ['digital'],
    ringtone: ['ringtone'],
    ring_loop: ['ringLoop'],
    shownotification: ['hourlyEnabled'],
    shownotificationtime: ['hourlyDuration'],
    noti_voice: ['hourlyVoice', 'hourlyVoiceText'],
    noti_sound: ['hourlySound'],
    noti_style: ['hourlyStyle'],
    noti_bgColor: ['hourlyBgColor'],
    manuallyclosenoti: ['hourlyManualClose'],
    badge: ['badge'],
    icon: ['icon'],
    show: ['badgeStatic'],
    badge_color: ['badgeColor'],
    clockcolor_value: ['clockColor'],
    clockDefinition: ['clockDefinition'],
    popup_version: ['popupVersion'],
    context_menu_item_enable: ['contextMenuEnabled'],
    enabletimezone: ['timezoneEnabled'],
    timezone: ['timezone'],
    keepawake: ['keepAwake'],
    language: ['language'],
    weather: ['weather']
  };
  const fields = fieldsByKey[key] || [];
  if (!fields.length) return clockState;
  const updated = await sendLegacy(
    'settings',
    Object.fromEntries(fields.map((field) => [field, settings[field]]))
  );
  if (updated) {
    clockState = updated;
    globalThis.coolClockSettings = updated.settings;
    globalThis.coolClockLanguage = updated.settings.language || '';
  }
  return updated;
}
