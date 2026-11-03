// Modern controller for the original voice-control page and its text fallback.
const voiceApi = globalThis.browser || globalThis.chrome;
const Recognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
let recognition;
let awaiting;

function printVoice(message, fromClock = false) {
  const node = document.createElement('div');
  node.className = 'dialog ' + (fromClock ? 'cp' : 'you');
  node.textContent = message;
  document.getElementById('opt').append(node);
  node.scrollIntoView({ block: 'end', behavior: 'smooth' });
  if (fromClock) {
    if (voiceApi.tts?.speak) voiceApi.tts.speak(message);
    else if ('speechSynthesis' in globalThis)
      speechSynthesis.speak(new SpeechSynthesisUtterance(message));
  }
}

async function command(text) {
  const input = text.trim();
  if (!input) return;
  printVoice(input);
  if (awaiting) {
    const next = awaiting;
    awaiting = null;
    await next(input);
    return;
  }
  const normalized = input.toLowerCase().replace(/[.!?]/g, '');
  const send = async (type, values) => {
    const result = await voiceApi.runtime.sendMessage({ target: 'worker', type, ...values });
    if (!result?.ok) throw Error(result?.error || 'Unable to save');
  };
  try {
    if (/^(what is|what's|whats|what)( the)? time( is it)?( now)?$/.test(normalized)) {
      printVoice('The time is ' + new Date().toLocaleString() + '.', true);
    } else if (/^(hi|hello|what's up)$/.test(normalized)) printVoice('Hello!', true);
    else if (/^(what is|what's|who are you)/.test(normalized)) printVoice('I am Cool Clock.', true);
    else if (/^(thank you|thanks)$/.test(normalized)) printVoice("You're welcome!", true);
    else if (/^(help|commands)$/.test(normalized))
      printVoice(
        'Try "What time is it?", "start timer", "set an alarm", or "set a countdown".',
        true
      );
    else if (/^(bye|goodbye|exit|close)$/.test(normalized)) {
      printVoice('See you later!', true);
      setTimeout(() => window.close(), 1500);
    } else if (/^(start|set|add)( a| an| the)? timer$/.test(normalized)) {
      const started = String(Date.now());
      await voiceApi.storage.local.set({
        'coolClockLegacy:timer_timestamp': started,
        'coolClockLegacy:timer_ori_timestamp': started
      });
      printVoice('Okay, I have started the timer for you.', true);
      const frame = document.createElement('iframe');
      frame.src = 'timer.html';
      frame.style.width = '100%';
      frame.title = 'Stopwatch';
      document.getElementById('opt').append(frame);
    } else if (/^(start|set|add)( a| an| the)? countdown$/.test(normalized)) {
      printVoice('Okay, how many seconds do you want it to be?', true);
      awaiting = async (answer) => {
        const seconds = Number(answer.match(/\d+/)?.[0]);
        if (!Number.isInteger(seconds) || seconds <= 0) {
          printVoice('Please enter a number of seconds.', true);
          return;
        }
        await send('add-timer', { seconds });
        printVoice(`Okay, I have set it to ${seconds} seconds.`, true);
      };
    } else if (/^(start|set|add)( a| an| the)? alarm$/.test(normalized)) {
      printVoice('Okay, what time should I set the alarm for? Enter HH:MM.', true);
      awaiting = async (answer) => {
        const match = answer.match(/^(\d{1,2}):(\d{2})$/);
        if (!match) {
          printVoice('Please enter a time as HH:MM.', true);
          return;
        }
        await send('add-alarm', {
          hour: Number(match[1]),
          minute: Number(match[2]),
          days: [],
          text: ''
        });
        printVoice(`Okay, alarm set for ${answer}.`, true);
      };
    } else printVoice(`I don't understand "${input}".`, true);
  } catch (error) {
    printVoice(error.message, true);
  }
}

document.getElementById('switch').addEventListener('click', () => {
  document.querySelector('.footer').classList.toggle('text');
  document.querySelector('.footer').classList.toggle('speech');
  document.getElementById('text').focus();
});
document.getElementById('text').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    command(event.target.value);
    event.target.value = '';
  }
});
document.getElementById('speech').addEventListener('click', () => {
  if (!Recognition) {
    printVoice('Speech recognition is not available in this browser. Use the text field.', true);
    return;
  }
  if (recognition) {
    recognition.stop();
    recognition = null;
    return;
  }
  recognition = new Recognition();
  recognition.lang = 'en-US';
  recognition.onresult = (event) => command(event.results[0][0].transcript);
  recognition.onerror = (event) => printVoice('Error: ' + event.error, true);
  recognition.onend = () => {
    recognition = null;
    document.getElementById('speech').classList.remove('listening');
  };
  recognition.start();
  document.getElementById('speech').classList.add('listening');
});
loadClockLanguage()
  .then(() => {
    document.title = t('contextVoiceControl') + ' - Cool Clock';
    printVoice(t('contextVoiceControl') + '. version 0.1');
    printVoice(
      'Welcome! Press the button below to begin, or switch to text mode. Say "help" for examples.',
      true
    );
  })
  .catch((error) => console.warn('Cool Clock: unable to load language', error));
