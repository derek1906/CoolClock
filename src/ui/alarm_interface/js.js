/* Alarm page controller. Loaded after mv3/legacy_bridge.js receives alarm data. */
const AlarmClock = LegacyBackground.Components.getSingleton('AlarmClock');
const alarmList = [];
const byId = (id) => document.getElementById(id);
const selectAll = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function glyph(name) {
  return createBootstrapIcon(name);
}

function refreshCount() {
  byId('count').textContent = alarmList.length;
  byId('count').classList.toggle('running', alarmList.length > 0);
  byId('removeAll').disabled = alarmList.length === 0;
}

function createModal(options = {}) {
  const settings = Object.assign(
    {
      title: '',
      content: '',
      backdrop: true,
      size: 'lg',
      buttons: [],
      closeBtn: true,
      closeBtnText: i18n('close'),
      onClose() {},
      onShown() {}
    },
    options
  );
  const modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('data-bs-backdrop', String(settings.backdrop));
  const dialog = document.createElement('div');
  dialog.className = 'modal-dialog modal-' + settings.size;
  const content = document.createElement('div');
  content.className = 'modal-content';
  const header = document.createElement('div');
  header.className = 'modal-header';
  const title = document.createElement('h4');
  title.className = 'modal-title';
  if (typeof settings.title === 'string') title.textContent = settings.title;
  else title.append(settings.title);
  header.append(title);
  const body = document.createElement('div');
  body.className = 'modal-body';
  if (typeof settings.content === 'string') body.textContent = settings.content;
  else if (settings.content) body.append(settings.content);
  const footer = document.createElement('div');
  footer.className = 'modal-footer';
  for (const entry of settings.buttons) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-' + (entry.primary ? 'primary' : 'outline-secondary');
    button.textContent = entry.title;
    button.addEventListener('click', () => entry.onclick.call(modal));
    footer.append(button);
  }
  if (settings.closeBtn) {
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'btn btn-outline-secondary';
    close.setAttribute('data-bs-dismiss', 'modal');
    close.textContent = settings.closeBtnText;
    footer.append(close);
  }
  content.append(header, body, footer);
  dialog.append(content);
  modal.append(dialog);
  modal.addEventListener('shown.bs.modal', settings.onShown, { once: true });
  modal.addEventListener(
    'hidden.bs.modal',
    () => {
      modal.remove();
      settings.onClose();
    },
    { once: true }
  );
  document.body.append(modal);
  showBootstrapModal(modal);
  return modal;
}

function createControl(parent, name, title, container) {
  const button = document.createElement('span');
  button.setAttribute('data-bs-toggle', 'tooltip');
  button.setAttribute('data-bs-placement', 'right');
  button.title = title;
  button.append(glyph(name));
  parent.append(button);
  initBootstrapTooltip(button, { container, delay: { show: 300 } });
  return button;
}

function editContent(source) {
  const group = source.parentElement.cloneNode(true);
  const label = source.parentElement.previousElementSibling.cloneNode(true);
  [group, label].forEach((node) => {
    node.removeAttribute('id');
    selectAll('[id]', node).forEach((child) => child.removeAttribute('id'));
  });
  group.style.textAlign = 'center';
  const content = document.createElement('div');
  content.append(label, group);
  return { content, group, label };
}

function timeValue(input, maximum) {
  input.value = input.value.replace(/[^0-9]/g, '').slice(0, 2);
  if (input.value === '') return;
  input.value = String(Math.min(maximum, Number(input.value))).padStart(2, '0');
}

function updateSetButton() {
  byId('set').disabled = !byId('h').value || !byId('m').value;
}

function bindTimeInputs(inputs, setButton) {
  inputs.forEach((input, index) => {
    input.addEventListener('blur', () => timeValue(input, index === 0 ? 24 : 59));
    input.addEventListener('input', () => {
      input.value = input.value.replace(/[^0-9]/g, '').slice(0, 2);
      if (
        (input.value.length === 2 || (index === 0 && Number(input.value) > 2)) &&
        inputs[index + 1]
      ) {
        inputs[index + 1].focus();
        inputs[index + 1].select();
      }
      if (setButton) updateSetButton();
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Backspace' && !input.value && inputs[index - 1]) {
        inputs[index - 1].select();
        event.preventDefault();
      }
    });
  });
  if (setButton) updateSetButton();
}

function bindWeekdays(root) {
  root.addEventListener('change', (event) => {
    if (event.target.matches('input[type="checkbox"]')) {
      event.target.closest('label').classList.toggle('active', event.target.checked);
    }
  });
}

function selectEveryDay(root) {
  selectAll('label input', root).forEach((input) => {
    if (!input.checked) {
      input.checked = true;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
}

function openEditModal(content, save, focus, finish) {
  const modal = createModal({
    title: 'Editing',
    content,
    closeBtn: false,
    buttons: [
      {
        title: 'Apply Edit',
        primary: true,
        onclick() {
          if (save()) hideBootstrapModal(modal);
        }
      },
      {
        title: 'Finish Edit',
        primary: true,
        onclick() {
          if (save()) {
            if (finish) modal.addEventListener('hidden.bs.modal', finish, { once: true });
            hideBootstrapModal(modal);
          }
        }
      },
      {
        title: i18n('cancel'),
        onclick() {
          hideBootstrapModal(modal);
        }
      }
    ],
    onShown: focus
  });
}

function Entry(data, initial = false) {
  const block = document.createElement('div');
  block.className = 'block';
  const body = document.createElement('div');
  body.className = 'bContent';
  const controls = document.createElement('div');
  controls.className = 'controls';
  const editCheckmarkDiv = document.createElement('div');
  editCheckmarkDiv.className = 'editCheckmark';
  const wrapper = document.createElement('div');
  wrapper.className = 'wrapper';
  const leftPanel = document.createElement('div');
  leftPanel.className = 'left-panel';
  const rightPanel = document.createElement('div');
  rightPanel.className = 'right-panel';
  const time = document.createElement('div');
  time.className = 'time';
  const weekdays = document.createElement('ul');
  weekdays.className = 'weekdays';
  const messageTitle = document.createElement('div');
  messageTitle.className = 'record-title';
  messageTitle.textContent = 'Message';
  const message = document.createElement('div');
  message.className = 'message';

  const deleteButton = createControl(controls, 'trash', 'Delete', body);
  const editButton = createControl(controls, 'pencil', 'Edit', body);
  const enableButton = createControl(controls, 'off', 'Toggle on/off', body);
  const finishButton = createControl(editCheckmarkDiv, 'ok', 'Done', body);
  leftPanel.append(time, weekdays);
  rightPanel.append(messageTitle, message);
  wrapper.append(leftPanel, rightPanel);
  body.append(controls, editCheckmarkDiv, wrapper);
  block.append(body);
  if (initial) byId('record').append(block);
  else {
    block.classList.add('animate', 'collapsed', 'shrink');
    byId('record').prepend(block);
    setTimeout(() => block.classList.remove('collapsed'), 10);
    setTimeout(() => block.classList.remove('shrink'), 310);
  }

  let editing = false;
  const commands = {
    id: data.id,
    node: block,
    update() {
      time.textContent =
        String(data.hour).padStart(2, '0') + ':' + String(data.min).padStart(2, '0');
      block.classList.toggle('day', data.hour >= 6 && data.hour < 18);
      block.classList.toggle('night', data.hour < 6 || data.hour >= 18);
      message.textContent = data.text || '-';
      weekdays.replaceChildren();
      if (data.type === 'o' || !data.day.length) {
        const item = document.createElement('li');
        item.className = 'active';
        item.textContent = 'Once';
        weekdays.append(item);
      } else {
        const days = data.type === 'd' ? [0, 1, 2, 3, 4, 5, 6] : data.day;
        Array.from('SMTWTFS').forEach((letter, index) => {
          const item = document.createElement('li');
          item.textContent = letter;
          item.classList.toggle('active', days.includes(index));
          weekdays.append(item);
        });
      }
      block.classList.toggle('off', !!data.off);
      return this;
    },
    remove() {
      AlarmClock.remove(data.id);
      block.classList.add('animate', 'shrink');
      setTimeout(() => {
        block.classList.add('collapsed');
        setTimeout(() => {
          disposeBootstrapTooltips(block);
          block.remove();
        }, 300);
      }, 300);
      const index = alarmList.indexOf(this);
      if (index !== -1) alarmList.splice(index, 1);
      refreshCount();
    },
    toggleEdit() {
      editing = !editing;
      block.classList.toggle('edit', editing);
      if (editing)
        LegacyBackground.createNoti({
          title: 'Click on the part you wish to edit.',
          message: 'When done, click the checkmark to finish.'
        });
    }
  };
  commands.update();

  deleteButton.addEventListener('click', () => commands.remove());
  enableButton.addEventListener('click', () => {
    data.set('off', !data.off);
    commands.update();
  });
  editButton.addEventListener('click', () => commands.toggleEdit());
  finishButton.addEventListener('click', () => commands.toggleEdit());

  time.addEventListener('click', () => {
    if (!editing) return;
    const { content, group } = editContent(byId('h'));
    const inputs = selectAll('input', group);
    inputs[0].value = data.hour;
    inputs[1].value = data.min;
    bindTimeInputs(inputs, false);
    inputs[0].dispatchEvent(new Event('blur'));
    inputs[1].dispatchEvent(new Event('blur'));
    openEditModal(
      content,
      () => {
        if (!inputs[0].value || !inputs[1].value) return false;
        data.set({ hour: Number(inputs[0].value), min: Number(inputs[1].value) });
        commands.update();
        return true;
      },
      () => inputs[0].focus(),
      () => commands.toggleEdit()
    );
  });

  message.addEventListener('click', () => {
    if (!editing) return;
    const { content, group } = editContent(byId('message'));
    const input = group.querySelector('input');
    input.value = data.text || '';
    openEditModal(
      content,
      () => {
        data.set('text', input.value);
        commands.update();
        return true;
      },
      () => input.focus(),
      () => commands.toggleEdit()
    );
  });

  weekdays.addEventListener('click', () => {
    if (!editing) return;
    const { content, group, label } = editContent(byId('weekdays'));
    const dayGroup = group.querySelector('.btn-group');
    bindWeekdays(dayGroup);
    const inputs = selectAll('input', dayGroup);
    inputs.forEach((input, index) => {
      input.checked = data.day.includes(index);
      input.closest('label').classList.toggle('active', input.checked);
    });
    const daily = label.querySelector('button');
    if (daily) daily.addEventListener('click', () => selectEveryDay(dayGroup));
    openEditModal(
      content,
      () => {
        const days = inputs.flatMap((input, index) => (input.checked ? [index] : []));
        data.set({ day: days, type: days.length ? 's' : 'o' });
        commands.update();
        return true;
      },
      () => inputs[0].focus(),
      () => commands.toggleEdit()
    );
  });

  return commands;
}

function setupAlarmPage() {
  i18n.translate();
  selectAll('gly').forEach((element) => {
    const replacement = glyph(element.getAttribute('icon'));
    replacement.className += ' ' + element.className;
    element.replaceWith(replacement);
  });
  selectAll('[data-bs-toggle="tooltip"]').forEach((element) => {
    initBootstrapTooltip(element, {
      placement: element.getAttribute('data-bs-placement') || 'auto',
      delay: { show: 500, hide: 0 },
      container: 'body'
    });
  });
  document.addEventListener('contextmenu', (event) => {
    if (!event.target.matches('input[type="text"]')) event.preventDefault();
  });

  byId('add').addEventListener('click', function () {
    const configure = byId('configure');
    const opening = configure.classList.contains('collapsed');
    this.replaceChildren(glyph(opening ? 'minus' : 'plus'));
    configure.classList.toggle('collapsed');
    if (opening) byId('h').focus();
  });
  bindTimeInputs([byId('h'), byId('m')], true);
  selectAll('.input-time > input, #message').forEach((input) => {
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !byId('set').disabled) {
        byId('set').click();
        input.blur();
      }
    });
  });
  bindWeekdays(byId('weekdays'));
  byId('daily').addEventListener('click', () => selectEveryDay(byId('weekdays')));
  byId('set').addEventListener('click', () => {
    const days = selectAll('#weekdays input').flatMap((input, index) =>
      input.checked ? [index] : []
    );
    const alarm = AlarmClock.create(Number(byId('h').value), Number(byId('m').value), {
      type: days.length ? 's' : 'o',
      day: days,
      text: byId('message').value,
      off: false
    });
    alarmList.push(new Entry(alarm));
    refreshCount();
    byId('add').click();
    byId('configure')
      .querySelectorAll('input')
      .forEach((input) => input.blur());
  });
  byId('removeAll').addEventListener('click', function () {
    this.blur();
    const title = document.createElement('span');
    title.append(glyph('info-sign'), ' Are you sure?');
    const modal = createModal({
      title,
      content: 'This cannot be reverted.',
      closeBtn: false,
      backdrop: 'static',
      size: 'sm',
      buttons: [
        {
          title: i18n('cancel'),
          primary: true,
          onclick() {
            hideBootstrapModal(modal);
          }
        },
        {
          title: i18n('OK'),
          onclick() {
            alarmList
              .slice()
              .forEach((entry, index) => setTimeout(() => entry.remove(), index * 100));
            hideBootstrapModal(modal);
          }
        }
      ]
    });
  });
  window.addEventListener('beforeunload', () =>
    LegacyBackground.Components.getSingleton('WindowManager').registerOnClose(window)
  );

  AlarmClock.getAll().forEach((alarm) => alarmList.push(new Entry(alarm, true)));
  refreshCount();
  if (!alarmList.length || location.hash === '#set') {
    if (location.hash === '#set') history.replaceState(null, '', location.pathname);
    byId('add').click();
  }
}

setupAlarmPage();
