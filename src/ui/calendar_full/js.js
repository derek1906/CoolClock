/* Full calendar controller using native DOM and dialogs. */
let currentMonth = [new Date().getFullYear(), new Date().getMonth()];
let calendarAnimations = [];
let slideToken = 0;
let focusTimers = [];
const byId = (id) => document.getElementById(id);
const selectAll = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const pad = (number) => String(number).padStart(2, '0');

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function readTodos() {
  return clockState.todos;
}

function writeTodos(value) {
  clockState.todos = value;
  sendLegacy('replace-todos', { todos: value });
}

function formattedDate(key) {
  const parts = { Year: key.slice(0, 4), Month: key.slice(4, 6), Date: key.slice(6, 8) };
  let order;
  try {
    order = JSON.parse(calendarPrefs.dateorder || '{}');
  } catch {
    order = {};
  }
  return [order['1'] || 'Date', order['2'] || 'Month', order['3'] || 'Year']
    .map((part) => parts[part])
    .join('-');
}

function isoDate(key) {
  return key.slice(0, 4) + '-' + key.slice(4, 6) + '-' + key.slice(6, 8);
}

function dialogButton(label, onclick) {
  const button = make('button', 'calendar-dialog__button', label);
  button.type = 'button';
  button.addEventListener('click', onclick);
  return button;
}

function openDialog(source, options = {}) {
  const settings = Object.assign(
    { title: source.title || '', width: 500, buttons: [], onClose() {} },
    options
  );
  const parent = source.parentNode;
  const next = source.nextSibling;
  const dialog = document.createElement('dialog');
  dialog.className = 'calendar-dialog';
  dialog.style.width = settings.width + 'px';
  const titlebar = make('div', 'calendar-dialog__titlebar');
  titlebar.append(make('span', 'calendar-dialog__title', settings.title));
  const closeButton = make('button', 'calendar-dialog__close');
  closeButton.type = 'button';
  closeButton.title = i18n('close');
  closeButton.setAttribute('aria-label', i18n('close'));
  titlebar.append(closeButton);
  const pane = make('div', 'calendar-dialog__footer');
  const buttonSet = make('div', 'calendar-dialog__actions');
  pane.append(buttonSet);
  for (const entry of settings.buttons) {
    buttonSet.append(dialogButton(entry.text, () => entry.click(close)));
  }
  source.classList.add('calendar-dialog__content');
  dialog.append(titlebar, source, pane);
  document.body.append(dialog);
  function close() {
    if (!dialog.open) return;
    dialog.close();
    if (parent) parent.insertBefore(source, next);
    source.classList.remove('calendar-dialog__content');
    dialog.remove();
    settings.onClose();
  }
  closeButton.addEventListener('click', close);
  dialog.addEventListener('cancel', (event) => event.preventDefault());
  dialog.showModal();
  return { dialog, close };
}

function openMessage(text, title = '') {
  const content = make('div', '', text);
  return openDialog(content, {
    title,
    buttons: [{ text: i18n('OK'), click: (close) => close() }]
  });
}

function createCalendarHeader() {
  const header = byId('header');
  const toolbar = make('div');
  const showAll = make('button');
  showAll.id = 'showAll';
  const previous = make('button', '', '＜');
  previous.id = 'prevMonth';
  const date = make('span');
  date.id = 'date';
  const next = make('button', '', '＞');
  next.id = 'nextMonth';
  const options = make('button', '', '...');
  options.id = 'showOptions';
  toolbar.append(showAll, previous, date, next, options);
  const weekdays = make('div');
  for (let day = 0; day < 7; day++) weekdays.append(make('div', '', i18n('day_' + day)));
  header.append(toolbar, weekdays);
  showAll.addEventListener('click', () => byId('menu').classList.toggle('expanded'));
  previous.addEventListener('click', () => moveMonth(-1));
  next.addEventListener('click', () => moveMonth(1));
  date.addEventListener('click', openDateChooser);
  options.addEventListener('click', openCalendarOptions);
}

function makeDayCell(date, month, editable) {
  const key = String(date.getFullYear()) + pad(date.getMonth() + 1) + pad(date.getDate());
  const cell = make('div', 'grid');
  cell.dataset.id = key;
  if (date.getMonth() !== month) {
    cell.classList.add(date < new Date(currentMonth[0], month, 1) ? 'prevDay' : 'nextDay');
  }
  cell.append(make('div', 'digit', date.getDate()), make('div', 'todoArea'));
  if (editable) {
    const today = new Date();
    if (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    ) {
      cell.classList.add('today');
    }
    cell.addEventListener('click', () => createTodo(key));
  }
  if (calendarPrefs.lunar === 'true') {
    const lunar = make('div', 'lunar');
    try {
      const label = LegacyBackground.Functions.time().getCalendar('lunar', date);
      lunar.textContent = label.slice(-2);
    } catch (error) {
      console.warn('Lunar date:', error);
    }
    cell.append(lunar);
  }
  return cell;
}

function createCalendar() {
  const year = currentMonth[0];
  const month = currentMonth[1];
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const offset = first.getDay();
  const total = Math.ceil((offset + days + 1) / 7) * 7;
  const content = make('div', 'content');
  for (let index = 0; index < total; index++) {
    const date = new Date(year, month, index - offset + 1);
    content.append(makeDayCell(date, month, date.getMonth() === month));
  }
  byId('date').textContent = year + ' ' + i18n('month_' + (month + 1));
  return content;
}

function finishCalendarSlide() {
  slideToken++;
  calendarAnimations.forEach((animation) => animation.cancel());
  calendarAnimations = [];
  const contents = selectAll('#wrapper > .content');
  contents.slice(0, -1).forEach((content) => content.remove());
  if (contents.length) {
    contents.at(-1).style.position = '';
    contents.at(-1).style.inset = '';
  }
}

function moveMonth(direction) {
  finishCalendarSlide();
  const wrapper = byId('wrapper');
  const old = wrapper.querySelector('.content');
  const date = new Date(currentMonth[0], currentMonth[1] + direction, 1);
  currentMonth = [date.getFullYear(), date.getMonth()];
  const next = createCalendar();
  wrapper.append(next);
  if (old && typeof next.animate === 'function') {
    const token = ++slideToken;
    const distance = Math.max(wrapper.clientHeight, old.clientHeight, 1);
    const from = direction > 0 ? distance : -distance;
    wrapper.style.position = 'relative';
    for (const content of [old, next]) {
      content.style.position = 'absolute';
      content.style.inset = '0';
    }
    calendarAnimations = [
      old.animate(
        [{ transform: 'translateY(0px)' }, { transform: 'translateY(' + -from + 'px)' }],
        { duration: 300, easing: 'ease', fill: 'forwards' }
      ),
      next.animate(
        [{ transform: 'translateY(' + from + 'px)' }, { transform: 'translateY(0px)' }],
        { duration: 300, easing: 'ease', fill: 'forwards' }
      )
    ];
    Promise.allSettled(calendarAnimations.map((animation) => animation.finished)).then(() => {
      if (token === slideToken && next.isConnected) {
        old.remove();
        next.style.position = '';
        next.style.inset = '';
        calendarAnimations = [];
      }
    });
  } else if (old) old.remove();
  renderTodos();
}

function updateContent() {
  finishCalendarSlide();
  byId('wrapper').replaceChildren(createCalendar());
  renderTodos();
}

function saveTodo(date, text, addition = {}) {
  if (!date || !text?.trim()) return false;
  const key = date.replaceAll('-', '');
  const todos = readTodos();
  const entries = (todos[key] ||= []);
  entries.push({ text: text.trim(), id: Date.now() + Math.random(), ...addition });
  writeTodos(todos);
  return true;
}

function deleteTodo(date, id) {
  const key = date.replaceAll('-', '');
  const todos = readTodos();
  if (!todos[key]) return;
  todos[key] = todos[key].filter((entry) => String(entry.id) !== String(id));
  if (!todos[key].length) delete todos[key];
  writeTodos(todos);
}

function addDetail(parent, label, value) {
  parent.append(make('div', 'additional', label + value));
}

function openEntry(date, entry) {
  const content = byId('view_dialog');
  content.replaceChildren(document.createTextNode(entry.text || ''));
  if (entry.startTime) {
    const start = new Date(entry.startTime);
    const end = new Date(entry.endTime);
    addDetail(content, 'Starting time: ', pad(start.getHours()) + ':' + pad(start.getMinutes()));
    addDetail(content, 'Ending time: ', pad(end.getHours()) + ':' + pad(end.getMinutes()));
  }
  if (entry.place) addDetail(content, 'Location: ', entry.place);
  if (entry.importFrom) addDetail(content, 'Imported from: ', '"' + entry.importFrom + '"');
  addDetail(content, 'Event ID: ', entry.id);
  const view = openDialog(content, {
    title: date,
    buttons: [
      {
        text: 'View',
        click: (close) => {
          close();
          goToDate(date, true);
        }
      },
      {
        text: 'Delete',
        click: () => {
          const confirm = make('div', '', 'Todo will be deleted permanently.');
          openDialog(confirm, {
            title: 'Confirm delete?',
            buttons: [
              {
                text: i18n('OK'),
                click: (close) => {
                  deleteTodo(date, entry.id);
                  close();
                  view.close();
                  updateContent();
                }
              },
              { text: i18n('cancel'), click: (close) => close() }
            ]
          });
        }
      },
      { text: i18n('OK'), click: (close) => close() }
    ]
  });
}

function renderTodos() {
  const sidebar = byId('todo');
  sidebar.replaceChildren();
  selectAll('#wrapper .todoArea').forEach((area) => area.replaceChildren());
  const todos = readTodos();
  const dates = Object.keys(todos).sort();
  if (!dates.length) {
    sidebar.textContent = 'No event.';
    return;
  }
  const cells = new Map(selectAll('#wrapper .grid').map((cell) => [cell.dataset.id, cell]));
  for (const key of dates) {
    const group = make('div');
    group.append(make('div', 'legend', formattedDate(key)));
    for (const entry of todos[key]) {
      const item = make('div', 'entry', entry.text);
      item.addEventListener('click', () => openEntry(isoDate(key), entry));
      group.append(item);
      const area = cells.get(key)?.querySelector('.todoArea');
      if (area) area.append(make('div', 'todoMemo', entry.text));
    }
    sidebar.append(group);
  }
}

function createTodo(key) {
  const content = byId('create_dialog');
  byId('create_date').value = isoDate(key);
  const text = byId('create_text');
  const dialog = openDialog(content, {
    title: content.title,
    buttons: [
      {
        text: 'Save',
        click: (close) => {
          if (saveTodo(byId('create_date').value, text.value)) {
            text.value = '';
            close();
            updateContent();
          }
        }
      },
      { text: i18n('cancel'), click: (close) => close() }
    ]
  });
  text.focus();
  return dialog;
}

function openCalendarOptions() {
  const content = byId('options');
  openDialog(content, {
    title: i18n('settings'),
    width: 600,
    buttons: [
      {
        text: 'Done',
        click: (close) => {
          close();
          updateContent();
        }
      }
    ]
  });
}

function openDateChooser() {
  const content = byId('dateChoose');
  const input = content.querySelector('input[type="date"]');
  input.value = currentMonth[0] + '-' + pad(currentMonth[1] + 1) + '-01';
  openDialog(content, {
    title: content.title,
    buttons: [
      {
        text: 'Today',
        click: (close) => {
          const today = new Date();
          close();
          goToDate(
            today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate())
          );
        }
      },
      {
        text: i18n('OK'),
        click: (close) => {
          close();
          goToDate(input.value, true);
        }
      },
      { text: i18n('cancel'), click: (close) => close() }
    ]
  });
}

function goToDate(value, focus = false) {
  const match = String(value || '').match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day)
    return false;
  if (year !== currentMonth[0] || month !== currentMonth[1]) {
    currentMonth = [year, month];
    updateContent();
  }
  if (focus) {
    focusTimers.forEach(clearTimeout);
    focusTimers = [];
    const key = match[1] + match[2] + match[3];
    const target = selectAll('#wrapper .grid').find((cell) => cell.dataset.id === key);
    if (target) {
      for (let index = 0; index < 3; index++) {
        focusTimers.push(setTimeout(() => target.classList.add('focus'), index * 1000 + 250));
        focusTimers.push(setTimeout(() => target.classList.remove('focus'), index * 1000 + 750));
      }
    }
  }
  return true;
}

// Import iCalendar events from a public URL or a local .ics file.
const calendarApi = globalThis.browser || globalThis.chrome;

function parseCalendar(text, source) {
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  const events = [];
  for (const block of unfolded.matchAll(/BEGIN:VEVENT\r?\n([\s\S]*?)\r?\nEND:VEVENT/g)) {
    const fields = {};
    for (const line of block[1].split(/\r?\n/)) {
      const match = line.match(/^([A-Z]+)(?:;[^:]*)?:(.*)$/);
      if (match) fields[match[1]] = match[2];
    }
    const start = fields.DTSTART?.match(/^(\d{4})(\d{2})(\d{2})/);
    if (!start || !fields.SUMMARY) continue;
    const key = start[1] + start[2] + start[3];
    const summary = fields.SUMMARY.replace(/\\[nN]/g, ' ')
      .replace(/\\([,;\\])/g, '$1')
      .trim();
    if (!summary) continue;
    events.push({ date: key, text: summary.slice(0, 500), source });
  }
  return events;
}

async function importCalendar(text, source) {
  const entries = parseCalendar(text, source);
  if (!entries.length) throw Error('No calendar events found in this iCal file.');
  const response = await calendarApi.runtime.sendMessage({ target: 'worker', type: 'get' });
  if (!response?.ok) throw Error(response?.error || 'Unable to load calendar');
  const todos = response.data.todos;
  let added = 0;
  for (const entry of entries) {
    const list = (todos[entry.date] ||= []);
    if (list.some((item) => item.text === entry.text && item.importFrom === source)) continue;
    list.push({ text: entry.text, id: Date.now() + added, importFrom: source });
    added++;
  }
  const saved = await calendarApi.runtime.sendMessage({
    target: 'worker',
    type: 'replace-todos',
    todos
  });
  if (!saved?.ok) throw Error(saved?.error || 'Unable to save calendar');
  alert(`Imported ${added} calendar events.`);
  location.reload();
}

function setupCalendarImport() {
  document.getElementById('importCalendar').addEventListener('click', async () => {
    const input = document.querySelector('#options input[placeholder]');
    const value = input.value.trim();
    let url;
    if (value.startsWith('https://')) {
      url = new URL(value);
      if (url.hostname !== 'calendar.google.com' || !url.pathname.endsWith('.ics')) {
        alert('Use a Google Calendar iCal URL.');
        return;
      }
    } else if (/^[^\s@]+@[^\s@]+$/.test(value)) {
      url = new URL(
        `https://calendar.google.com/calendar/ical/${encodeURIComponent(value)}/public/basic.ics`
      );
    } else {
      alert('Enter a public calendar email address or iCal URL.');
      return;
    }
    try {
      const response = await fetch(url);
      if (!response.ok)
        throw Error(
          `Unable to fetch public calendar (${response.status}). Check that it is public.`
        );
      await importCalendar(await response.text(), value);
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById('importPrivateCalendar').addEventListener('click', () => {
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = '.ics,text/calendar';
    picker.onchange = async () => {
      const file = picker.files?.[0];
      if (!file) return;
      try {
        await importCalendar(await file.text(), file.name);
      } catch (error) {
        alert(error.message);
      }
    };
    picker.click();
  });
}

function setupCalendar() {
  i18n.translate();
  setupCalendarImport();
  createCalendarHeader();
  byId('menu').style.maxWidth = byId('container').clientWidth * 0.33 + 'px';
  byId('wrapper').append(createCalendar());
  renderTodos();
  byId('addTodo').addEventListener('click', () => {
    const now = new Date();
    createTodo(String(now.getFullYear()) + pad(now.getMonth() + 1) + pad(now.getDate()));
  });
  byId('deleteAll').addEventListener('click', () => {
    const content = make('div', '', 'All events will be deleted. Continue?');
    openDialog(content, {
      title: 'Confirm',
      buttons: [
        {
          text: 'Continue',
          click: (close) => {
            writeTodos({});
            close();
            updateContent();
          }
        },
        { text: i18n('cancel'), click: (close) => close() }
      ]
    });
  });
  const lunar = byId('options').querySelector('input[type="checkbox"]');
  lunar.checked = calendarPrefs.lunar === 'true';
  lunar.addEventListener('change', async () => {
    calendarPrefs.lunar = String(lunar.checked);
    const key = 'coolClockLegacy:lunar';
    await legacyApi.storage.local.set({ [key]: calendarPrefs.lunar });
    if (clockState.settings.syncEnabled !== false) {
      try {
        await legacyApi.storage.sync.set({ [key]: calendarPrefs.lunar });
      } catch (error) {
        console.warn('Cool Clock: option sync unavailable', error);
      }
    }
  });
  if (location.hash === '#viewall') byId('menu').classList.toggle('expanded');
  if (location.hash === '#settings') openCalendarOptions();
  const timestamp = new URLSearchParams(location.search).get('timestamp');
  if (timestamp) goToDate(timestamp, true);
}

setupCalendar();
