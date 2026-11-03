const weatherApi = globalThis.browser || globalThis.chrome;
const conditionNames = {
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
const condition = (code) => conditionNames[code] || 'Weather';

async function loadWeather() {
  const result = await weatherApi.runtime.sendMessage({ target: 'worker', type: 'get' });
  if (!result?.ok) throw Error(result?.error || 'Unable to load weather settings');
  const location = await resolveWeatherLocation(result.data.settings.weather, weatherApi);
  if (!location) throw Error('Choose a weather location in Settings.');
  const fahrenheit = location.unit === 'fahrenheit';
  const temperature = (value) =>
    `${Math.round(fahrenheit ? (value * 9) / 5 + 32 : value)}°${fahrenheit ? 'F' : 'C'}`;
  document.title = `${location.name} - Cool Clock`;
  document.getElementById('city').textContent = location.name;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(location.latitude)}&longitude=${encodeURIComponent(location.longitude)}&current=temperature_2m,relative_humidity_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
  const response = await fetch(url);
  if (!response.ok) throw Error(`Weather request failed (${response.status})`);
  const data = await response.json();
  const humidity = data.current?.relative_humidity_2m;
  const humidityText =
    typeof humidity === 'number' && Number.isFinite(humidity)
      ? ` · Humidity ${Math.round(humidity)}%`
      : '';
  document.getElementById('current').textContent =
    `Now: ${temperature(data.current.temperature_2m)} · ${condition(data.current.weather_code)}${humidityText}`;
  const cards = data.daily.time.map((date, index) => {
    const card = document.createElement('div');
    card.className = 'day';
    const heading = document.createElement('strong');
    heading.textContent = new Date(date + 'T12:00:00').toLocaleDateString(navigator.language, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    const label = document.createElement('span');
    label.textContent = condition(data.daily.weather_code[index]);
    const range = document.createElement('span');
    range.textContent = `${temperature(data.daily.temperature_2m_min[index])}–${temperature(data.daily.temperature_2m_max[index])}`;
    card.append(heading, label, range);
    return card;
  });
  document.getElementById('forecast').replaceChildren(...cards);
  document.getElementById('status').textContent = '';
}
let weatherLoading = false;
async function refreshWeather() {
  if (weatherLoading) return;
  weatherLoading = true;
  try {
    await loadWeather();
  } catch (error) {
    document.getElementById('status').textContent = error.message;
  } finally {
    weatherLoading = false;
  }
}
refreshWeather();
setInterval(() => {
  if (!document.hidden) refreshWeather();
}, 300000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refreshWeather();
});
