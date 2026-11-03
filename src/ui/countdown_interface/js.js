/* Countdown page controller. Loaded after mv3/legacy_bridge.js receives timer data. */
const CountdownTimer = LegacyBackground.Components.getSingleton('CountdownTimer');
const timerList = [];
const byId = (id) => document.getElementById(id);
const selectAll = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function glyph(name) {
  return createBootstrapIcon(name);
}

function countdownModal(options = {}) {
  const settings = Object.assign(
    {
      title: '',
      content: '',
      backdrop: true,
      size: 'lg',
      buttons: [],
      closeBtn: true,
      closeBtnText: i18n('close'),
      onClose() {}
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

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return (
    (hours ? hours + ':' + String(minutes).padStart(2, '0') : minutes) +
    ':' +
    String(remainder).padStart(2, '0')
  );
}

function updateCount() {
  byId('count').textContent = timerList.length;
  byId('count').classList.toggle('running', timerList.length > 0);
  const plural = document.querySelector('h1 > .plural');
  if (plural) plural.classList.toggle('shows', timerList.length > 1);
  byId('removeAll').disabled = timerList.length === 0;
}

function Entry(data, initial = false) {
  const block = document.createElement('div');
  block.className = 'block';
  const content = document.createElement('div');
  content.className = 'bContent';
  const progress = document.createElement('div');
  progress.className = 'progress progress-striped active';
  const bar = document.createElement('div');
  bar.className = 'progress-bar';
  bar.setAttribute('role', 'progressbar');
  const remaining = document.createElement('div');
  remaining.className = 'progress-bar-text';
  progress.append(bar, remaining);
  const buttons = document.createElement('div');
  buttons.className = 'btn-group';
  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'btn btn-outline-secondary btn-sm deleteBtn';
  removeButton.title = 'Delete';
  removeButton.append(glyph('trash'));
  const repeatButton = document.createElement('button');
  repeatButton.type = 'button';
  repeatButton.className = 'btn btn-outline-secondary btn-sm';
  repeatButton.title = 'Toggle Repeat';
  repeatButton.append(glyph('repeat'));
  buttons.append(removeButton, repeatButton);
  const message = document.createElement('div');
  message.className = 'message';
  content.append(progress, document.createTextNode(' '), buttons, message);
  block.append(content);
  if (initial) byId('content').append(block);
  else {
    block.classList.add('animate', 'shrink');
    byId('addpanel').after(block);
    setTimeout(() => block.classList.remove('shrink'), 10);
  }

  let refreshing = false;
  const commands = {
    id: data.id,
    node: block,
    remove(internal = false) {
      if (!internal) CountdownTimer.remove(data.id);
      const index = timerList.indexOf(this);
      if (index !== -1) timerList.splice(index, 1);
      updateCount();
      block.classList.add('animate', 'shrink');
      setTimeout(() => {
        block.classList.add('collapsed');
        setTimeout(() => block.remove(), 300);
      }, 300);
    },
    async refreshExpired() {
      if (refreshing) return;
      refreshing = true;
      try {
        const response = await legacyApi.runtime.sendMessage({ target: 'worker', type: 'get' });
        if (!response?.ok) return;
        const current = response.data.countdowns.find((timer) => timer.id === data.id);
        if (current) Object.assign(data, current);
        else this.remove(true);
      } catch (error) {
        console.warn('Cool Clock countdown refresh:', error);
      } finally {
        refreshing = false;
      }
    },
    update() {
      const remainingMs = data.end - Date.now();
      if (remainingMs <= 0 && !data.repeat) {
        this.remove(true);
        return;
      }
      if (remainingMs <= 0 && data.repeat) this.refreshExpired();
      bar.className = 'progress-bar progress-bar-' + data.color;
      bar.style.width =
        Math.max(0, Math.min(100, ((data.end - Date.now()) / data.duration) * 100)) + '%';
      remaining.textContent =
        'Remaining Time: ' + formatTime(Math.max(0, Math.ceil(remainingMs / 1000)));
      message.textContent = data.message || '-';
      repeatButton.classList.toggle('active', !!data.repeat);
    }
  };
  removeButton.addEventListener('click', () => commands.remove());
  repeatButton.addEventListener('click', () => {
    data.set('repeat', !data.repeat);
    repeatButton.classList.toggle('active', !!data.repeat);
  });
  commands.update();
  return commands;
}

function setupCountdownPage() {
  i18n.translate();
  selectAll('gly').forEach((element) => {
    const replacement = glyph(element.getAttribute('icon'));
    replacement.className += ' ' + element.className;
    element.replaceWith(replacement);
  });
  byId('add').addEventListener('click', function () {
    const panel = byId('addpanel');
    panel.classList.add('animate');
    if (panel.classList.contains('shrink')) {
      panel.classList.remove('collapsed');
      setTimeout(() => {
        panel.classList.remove('shrink');
        byId('h').focus();
      }, 300);
      this.replaceChildren(glyph('minus'));
    } else {
      panel.classList.add('shrink');
      setTimeout(() => panel.classList.add('collapsed'), 300);
      this.replaceChildren(glyph('plus'));
    }
  });
  const timeInputs = [byId('h'), byId('m'), byId('s')];
  const refreshSet = () => {
    byId('set').disabled =
      timeInputs.reduce((sum, input) => sum + Number(input.value || 0), 0) === 0;
  };
  timeInputs.forEach((input, index) => {
    input.addEventListener('blur', () => {
      if (input.value) input.value = String(Math.min(index === 0 ? 99 : 59, Number(input.value)));
    });
    input.addEventListener('input', () => {
      input.value = input.value.replace(/[^0-9]/g, '').slice(0, 2);
      if (input.value.length === 2 && timeInputs[index + 1]) {
        timeInputs[index + 1].focus();
        timeInputs[index + 1].select();
      }
      refreshSet();
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Backspace' && !input.value && timeInputs[index - 1]) {
        timeInputs[index - 1].select();
        event.preventDefault();
      }
    });
  });
  [...timeInputs, byId('message')].forEach((input) =>
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !byId('set').disabled) {
        byId('set').click();
        input.blur();
      }
    })
  );

  selectAll('.input-color button').forEach((button) =>
    button.addEventListener('click', function () {
      selectAll('.input-color button').forEach((item) =>
        item.classList.toggle('active', item === this)
      );
    })
  );
  byId('repeat').addEventListener('click', function () {
    this.classList.toggle('active');
    this.dataset.value = String(this.classList.contains('active'));
  });
  byId('set').addEventListener('click', () => {
    const duration =
      Number(byId('h').value || 0) * 3600 +
      Number(byId('m').value || 0) * 60 +
      Number(byId('s').value || 0);
    if (!Number.isInteger(duration) || duration < 1) return;
    const color = document.querySelector('.input-color button.active')?.value || 'primary';
    const data = CountdownTimer.create(Date.now() + duration * 1000, {
      message: byId('message').value,
      color,
      repeat: byId('repeat').classList.contains('active')
    });
    byId('add').replaceChildren(glyph('plus'));
    const panel = byId('addpanel');
    panel.classList.add('animate', 'swipe');
    setTimeout(() => {
      panel.classList.remove('animate', 'swipe');
      panel.classList.add('shrink', 'collapsed');
      timerList.push(new Entry(data));
      updateCount();
    }, 300);
  });
  byId('removeAll').addEventListener('click', function () {
    this.blur();
    const title = document.createElement('span');
    title.append(glyph('info-sign'), ' Are you sure?');
    const modal = countdownModal({
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
            timerList
              .slice()
              .forEach((entry, index) => setTimeout(() => entry.remove(), index * 100));
            hideBootstrapModal(modal);
          }
        }
      ]
    });
  });
  document.addEventListener('contextmenu', (event) => {
    if (event.target.id !== 'message') event.preventDefault();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'F5') event.preventDefault();
  });
  window.addEventListener('beforeunload', () =>
    LegacyBackground.Components.getSingleton('WindowManager').registerOnClose(window)
  );

  restoreLegacyCountdownPreset();
  refreshSet();
  CountdownTimer.getAll().forEach((data) => timerList.push(new Entry(data, true)));
  updateCount();
  if (!timerList.length) setTimeout(() => byId('add').click(), 200);
  if (i18n.lang() === 'en') {
    const plural = document.createElement('span');
    plural.className = 'plural';
    plural.setAttribute('data-bs-toggle', 'tooltip');
    plural.setAttribute('data-bs-placement', 'bottom');
    plural.setAttribute('data-bs-html', 'true');
    plural.title = 'Here at Cool Clock HQ, we treat grammar <i>very</i> seriously.';
    plural.textContent = 's';
    document.querySelector('h1').append(plural);
  }
  initBootstrapTooltip(selectAll('[data-bs-toggle="tooltip"]'), {
    placement: 'auto',
    delay: { show: 500, hide: 0 },
    container: 'body'
  });
  setInterval(() => {
    timerList.slice().forEach((entry) => entry.update());
    updateCount();
  }, 300);
}

setupCountdownPage();
