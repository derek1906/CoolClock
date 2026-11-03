// Offscreen in Chrome; a background page in Firefox.
var ext = globalThis.browser || globalThis.chrome;
let audio;
function stopAudio() {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    audio = null;
  }
}
async function playAudio(url, repeat = false) {
  stopAudio();
  audio = new Audio(url || ext.runtime.getURL('sounds/alarm.ogg'));
  audio.loop = repeat;
  await audio.play();
}
function speakText(text) {
  speechSynthesis.cancel();
  speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}
function renderHourlyImage(message) {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 200;
  const context = canvas.getContext('2d');
  context.fillStyle = /^#[0-9a-f]{6}$/i.test(message.color) ? message.color : '#0772a1';
  context.fillRect(0, 0, 400, 200);
  context.fillStyle = '#fff';
  context.font = '300 72px Arial, sans-serif';
  context.fillText(message.time, 24, 105);
  context.font = '22px Arial, sans-serif';
  context.fillText(message.date, 25, 154, 350);
  return canvas.toDataURL('image/png');
}
ext.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message.target !== 'offscreen') return;
  if (message.type === 'play') {
    playAudio(message.url, message.repeat).then(
      () => respond(true),
      () => respond(false)
    );
    return true;
  } else if (message.type === 'stop') {
    stopAudio();
    respond(true);
  } else if (message.type === 'speak') {
    speakText(message.text);
    respond(true);
  } else if (message.type === 'copy') {
    const field = document.createElement('textarea');
    field.value = message.text;
    document.body.append(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    respond(copied);
  } else if (message.type === 'render-hourly') {
    respond(renderHourlyImage(message));
  }
});
