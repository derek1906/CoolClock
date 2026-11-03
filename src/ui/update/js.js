loadClockLanguage()
  .then(() => {
    document.querySelectorAll('[trans]').forEach((node) => {
      node.textContent = t(node.getAttribute('trans'));
    });
  })
  .catch((error) => console.warn('Cool Clock: unable to load language', error));
const headings = [...document.querySelectorAll('.main h3')];
const navigation = document.querySelector('#scrollSpy ul');
headings.forEach((heading) => {
  const id = `v${heading.textContent.slice(5).replace(/\s/g, '')}`;
  heading.id = id;
  const link = document.createElement('a');
  link.href = `#${id}`;
  link.textContent = heading.textContent;
  const item = document.createElement('li');
  item.append(link);
  navigation?.append(item);
  if (heading.dataset.date) {
    const date = document.createElement('small');
    date.textContent = `Release Date: ${new Date(Number(heading.dataset.date)).toLocaleDateString()}`;
    heading.after(date);
  }
});
function updateNavigation() {
  if (!navigation) return;
  navigation.classList.toggle('affix', window.scrollY >= 180);
  const current =
    [...headings].reverse().find((heading) => heading.getBoundingClientRect().top <= 40) ||
    headings[0];
  navigation.querySelectorAll('li').forEach((item) => {
    item.classList.toggle('active', item.querySelector('a')?.hash === `#${current?.id}`);
  });
}
window.addEventListener('scroll', updateNavigation, { passive: true });
updateNavigation();
if (document.getElementById('footerYear'))
  document.getElementById('footerYear').textContent = new Date().getFullYear();
