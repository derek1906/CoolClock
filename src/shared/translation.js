/**
 * Translation helpers for the original pages. Load messages before rendering.
 */

var languages = [
  'en',
  'zh-TW',
  'es',
  'ru',
  'nl',
  'pt-BR',
  'zh-CN',
  'fr',
  'he',
  'de',
  'pt-PT',
  'cs',
  'ro',
  'pl',
  'it',
  'fi',
  'tr',
  'id',
  'ja',
  'ko',
  'ca',
  'nb',
  'fa',
  'el',
  'hu',
  'vi',
  'bg',
  'sr'
];

var localeMessages = {};
var localeRequests = {};

function supportedLocale(language) {
  var normalized = String(language || '').replace('_', '-');
  if (languages.includes(normalized)) return normalized;
  var primary = normalized.split('-')[0];
  return languages.includes(primary) ? primary : 'en';
}

function loadLocaleMessages(language) {
  if (Object.prototype.hasOwnProperty.call(localeMessages, language))
    return Promise.resolve(localeMessages[language]);
  if (localeRequests[language]) return localeRequests[language];
  var url = chrome.runtime.getURL('/_locales/' + language.replace(/-/g, '_') + '/messages.json');
  localeRequests[language] = fetch(url)
    .then(function (response) {
      if (!response.ok) throw Error('HTTP ' + response.status);
      return response.json();
    })
    .catch(function (error) {
      console.warn('Could not load locale', language, error);
      return {};
    })
    .then(function (messages) {
      localeMessages[language] = messages;
      return messages;
    });
  return localeRequests[language];
}

i18n.load = function (language) {
  var selected = supportedLocale(language || i18n.lang());
  return Promise.all(
    selected === 'en'
      ? [loadLocaleMessages('en')]
      : [loadLocaleMessages(selected), loadLocaleMessages('en')]
  );
};

function i18n(key, lang) {
  if (window.Components && Components.getSingleton('Localization')) {
    if (lang) {
      return Components.getSingleton('Localization').getMessage(lang, key);
    } else {
      return Components.getSingleton('Localization').getMessage(key);
    }
  }

  var querylang = supportedLocale(typeof lang === 'undefined' ? i18n.lang() : lang);
  return (
    localeMessages[querylang]?.[key]?.message ||
    localeMessages.en?.[key]?.message ||
    chrome.i18n.getMessage(key) ||
    key
  );
}

i18n.lang = function () {
  return globalThis.coolClockLanguage || chrome.i18n.getUILanguage();
};

i18n.dateString = function (date) {
  return Intl.DateTimeFormat(i18n.lang(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
};
i18n.timeString = function (date) {
  return Intl.DateTimeFormat(i18n.lang(), {
    hour: 'numeric',
    minute: 'numeric',
    hour12: globalThis.coolClockSettings?.hour12 !== false
  }).format(date);
};
i18n.dateTimeString = function (date) {
  return Intl.DateTimeFormat(i18n.lang(), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: globalThis.coolClockSettings?.hour12 !== false,
    second: 'numeric'
  }).format(date);
};
i18n.customString = function (obj, date) {
  return Intl.DateTimeFormat(i18n.lang(), obj).format(date);
};

i18n.translate = function (ctx) {
  ctx = ctx || document;
  ctx.querySelectorAll('*[trans]').forEach(function (node) {
    var value = node.getAttribute('trans');
    if (value.indexOf(':') !== -1) {
      var ns = value.split(':');
      switch (ns[0]) {
        case 'wk':
          var date = new Date();
          date.setDate(date.getDate() + parseInt(ns[1], 10) - date.getDay());
          value = Intl.DateTimeFormat(i18n.lang(), { weekday: 'short' }).format(date);
          break;
        case 'wkl':
          var date = new Date();
          date.setDate(date.getDate() + parseInt(ns[1], 10) - date.getDay());
          value = Intl.DateTimeFormat(i18n.lang(), { weekday: 'long' }).format(date);
          break;
      }
      node.textContent = value;
    } else {
      node.textContent = i18n(node.getAttribute('trans'));
    }
  });

  ctx.querySelectorAll('body *').forEach(function (node) {
    [].forEach.call(node.attributes, function (attr) {
      var value = attr.nodeValue;
      if (/%[^%]+%/.test(value)) {
        while (/%[^%]+%/.test(value)) {
          var txt = value.match(/%([^%]+)%/)[1];
          if (txt.indexOf(':') !== -1) {
            var ns = txt.split(':');
            switch (ns[0]) {
              case 'wk':
                var date = new Date();
                date.setDate(date.getDate() + parseInt(ns[1], 10) - date.getDay());
                value = Intl.DateTimeFormat(i18n.lang(), { weekday: 'short' }).format(date);
                break;
              case 'wkl':
                var date = new Date();
                date.setDate(date.getDate() + parseInt(ns[1], 10) - date.getDay());
                value = Intl.DateTimeFormat(i18n.lang(), { weekday: 'long' }).format(date);
                break;
            }
          } else {
            value = value.replace(/%[^%]+%/, i18n(txt));
          }
        }
        node.setAttribute(attr.nodeName, value);
      }
    });
  });
};

function showcredit() {
  alert(
    'People who have helped me translate:\n\n - DerekL (繁體中文)\n\
 - Paulo + Silvia Cataldi + Dany (Español)\n\
 - Евгений + Cyber (updates) (Russian)\n\
 - Sumurai8 + Jack (Dutch)\n\
 - Loko (Português-BR)\n\
 - WindWT (简体中文)\n\
 - john.carter + Emmanuel DOLCINE (updates) (Français)\n\
 - barko (Hebrew)\n\
 - alm10965 + Heiko Buchert (German)\n\
 - Bruno (European Portuguese pt-PT)\n\
 - Jaykob + Burbon(Czech)\n\
 - Bogdan (Romanian)\n\
 - Karol Garlicki (Polish)\n\
 - Daniele Guttuso (Italian)\n\
 - kanttii (Finnish)\n\
 - Haldun Alay (Turkish)\n\
 - xiangwei xu (Indonesian)\n\
 - Cure Blossom + KSSK (日本語)\n\
 - Kusang (한국의)\n\
 - Àngel Agustí (Catalan)\n\
 - Jon Harald Søby (Norwegian [Bokmål])\n\
 - Pedram Jabbari (Persian)\n\
 - ~koloki8as~ (Greek)\n\
 - Pokorádi Zsuzsa (Hungarian)\n\
 - khanh nguyen le + SITUVN (Vietnamese)\n\
 - maicky + Stanimir Karavelikov (Bulgarian)\n\
 - Haldun Alay (Turkish)\n\
\n\
 Thanks for the helps!'
  );
}

function pupmonth(num) {
  return i18n('month_' + (num + 1));
}

function pupweekday(num) {
  return i18n('day_' + num);
}

function pmam() {
  var today = new Date();
  var am;
  var pm;
  if (getTimezone() >= 12) {
    return i18n('pm');
  } else {
    return i18n('am');
  }
}

function pupgreeting(num) {
  switch (num) {
    case 0:
      return i18n('morning');
    case 1:
      return i18n('noon');
    case 2:
      return i18n('evening');
    case 3:
      return i18n('night');
    case 4:
      return i18n('midnight');
  }
}

function popuppage() {
  popau.title = i18n('close');
  pav.textContent = i18n('settings');
  pag.textContent = i18n('timeis');
  pat.textContent = i18n('notflash');
  pbk.textContent = i18n('version');
  countdownbtn.title = i18n('countdown');
  commentbtn.title = i18n('comment');
  alarmbtn.title = i18n('alarm');
  info.title = i18n('stat');
  timerbtn.title = i18n('timer');
  viewsavedalarmbtn.title = i18n('viewsavedalarm');
  if (['zh-TW', 'zh-CN', 'ja'].includes(i18n.lang())) {
    text_tools.style.position = 'absolute';
    text_tools.style.transform = 'rotate(-90deg) translate(5px, -7px)';
    text_tools.textContent = i18n('tools');
  }
}

/*
function opquit(){
	if(unsave==1){
		return i18n("notsaved");
	}
}
*/
