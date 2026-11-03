// Expose Bootstrap's JavaScript API to the native page controllers.
const bootstrapIconNames = Object.freeze({
  bell: 'bell', bullhorn: 'megaphone', check: 'check-square',
  'chevron-right': 'chevron-right', comment: 'chat',
  'exclamation-sign': 'exclamation-circle-fill',
  'floppy-open': 'floppy2', 'folder-open': 'folder2-open',
  globe: 'globe', 'info-sign': 'info-circle-fill', minus: 'dash',
  off: 'power', ok: 'check-lg', 'ok-circle': 'check-circle-fill',
  pause: 'pause-fill', pencil: 'pencil',
  picture: 'image', play: 'play-fill', plus: 'plus-lg',
  repeat: 'arrow-repeat', 'resize-vertical': 'arrow-down-up',
  search: 'search', stop: 'stop-fill', trash: 'trash', wrench: 'wrench'
});

function createBootstrapIcon(name) {
  const mapped = bootstrapIconNames[name];
  if (!mapped) throw new Error(`Unknown icon: ${name}`);
  const span = document.createElement('span');
  span.className = `bi bi-${mapped}`;
  return span;
}

function showBootstrapModal(node) {
  const element = node instanceof Element ? node : node[0];
  element.addEventListener('hidden.bs.modal', () => {
    queueMicrotask(() => bootstrap.Modal.getInstance(element)?.dispose());
  }, {once: true});
  bootstrap.Modal.getOrCreateInstance(element).show();
  return node;
}

function hideBootstrapModal(node) {
  bootstrap.Modal.getInstance(node instanceof Element ? node : node[0])?.hide();
  return node;
}

function initBootstrapTooltip(elements, options) {
  for (const element of Array.from(elements instanceof Element ? [elements] : elements)) {
    bootstrap.Tooltip.getOrCreateInstance(element, options);
  }
  return elements;
}

function disposeBootstrapTooltips(root) {
  for (const element of root.querySelectorAll('[data-bs-toggle="tooltip"]')) {
    bootstrap.Tooltip.getInstance(element)?.dispose();
  }
}
