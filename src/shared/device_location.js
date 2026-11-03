// Browser location is used only after the user enables automatic weather location.
function deviceWeatherLabel() {
  if (typeof t === 'function') return t('optionsCurrentLocation');
  if (typeof i18n === 'function') return i18n('optionsCurrentLocation');
  return (
    (globalThis.browser || globalThis.chrome).i18n.getMessage('optionsCurrentLocation') ||
    'Current location'
  );
}

async function getCurrentWeatherPosition() {
  if (!navigator.geolocation) throw Error('Browser location is unavailable');
  const position = await new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      maximumAge: 60000,
      timeout: 12000
    })
  );
  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  )
    throw Error('Invalid location');
  return { latitude, longitude };
}

async function resolveWeatherLocation(location, api) {
  if (location?.mode !== 'device') return location;
  const name = deviceWeatherLabel();
  let position;
  try {
    position = await getCurrentWeatherPosition();
  } catch (error) {
    if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) throw error;
    return { ...location, name };
  }
  const { latitude, longitude } = position;
  const moved =
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude) ||
    Math.abs(location.latitude - latitude) >= 0.001 ||
    Math.abs(location.longitude - longitude) >= 0.001;
  const current = { ...location, latitude, longitude, name };
  if (!moved && location.name === name) return current;
  try {
    const result = await api.runtime.sendMessage({
      target: 'worker',
      type: 'refresh-device-weather',
      latitude,
      longitude,
      name
    });
    if (result?.ok) return result.data.settings.weather;
  } catch (error) {
    console.warn('Cool Clock: unable to save current weather location', error);
  }
  return current;
}
