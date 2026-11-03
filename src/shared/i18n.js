var ext = globalThis.browser || globalThis.chrome;
async function loadClockLanguage() {
  const result = await ext.runtime.sendMessage({ target: 'worker', type: 'get' });
  if (!result?.ok) throw Error(result?.error || 'Unable to load clock settings');
  globalThis.coolClockLanguage = result.data.settings.language || '';
  return result.data.settings;
}
function t(key, values) {
  const chosen = globalThis.coolClockLanguage || '';
  const locale = chosen.replace('-', '_');
  let value = globalThis.COOL_CLOCK_LOCALES?.[locale]?.[key] || ext.i18n.getMessage(key) || key;
  if (values)
    for (const [name, text] of Object.entries(values))
      value = value.replaceAll(`{${name}}`, String(text));
  return value;
}
