var aboutApi = globalThis.browser || globalThis.chrome;
loadClockLanguage()
  .then(() => {
    document.querySelectorAll('[trans]').forEach((node) => {
      node.textContent = t(node.getAttribute('trans'));
    });
  })
  .catch((error) => console.warn('Cool Clock: unable to load language', error));
document.getElementById('version').textContent = aboutApi.runtime.getManifest().version;
document
  .getElementById('settingsButton')
  .addEventListener('click', () => aboutApi.runtime.openOptionsPage());
document.getElementById('updateLogButton').addEventListener('click', () => {
  location.href = aboutApi.runtime.getURL('update.html');
});
document.getElementById('permissionButton').addEventListener('click', async () => {
  const permissions = await aboutApi.permissions.getAll();
  alert(
    `Permissions: ${(permissions.permissions || []).join(', ')}\nOrigins: ${(permissions.origins || []).join(', ')}`
  );
});
