// Fill the original compact calendar table in the optional old popup.
let compactMonth = new Date();
let compactTodos = {};

function renderCompactCalendar() {
  const year = compactMonth.getFullYear();
  const month = compactMonth.getMonth();
  document.getElementById('yearnmonth').textContent = compactMonth.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long'
  });
  const first = new Date(year, month, 1).getDay();
  const length = new Date(year, month + 1, 0).getDate();
  for (let index = 0; index < 42; index++) {
    const cell = document.getElementById(`td${Math.floor(index / 7) + 1}${index % 7}`);
    if (!cell) continue;
    const day = index - first + 1;
    const visible = day > 0 && day <= length;
    const span = cell.querySelector('span');
    span.textContent = visible ? String(day) : '';
    const key = `${year}${String(month + 1).padStart(2, '0')}${String(day).padStart(2, '0')}`;
    cell.classList.toggle(
      'today',
      visible &&
        year === new Date().getFullYear() &&
        month === new Date().getMonth() &&
        day === new Date().getDate()
    );
    cell.classList.toggle('eventday', visible && !!compactTodos[key]?.length);
    cell.title =
      visible && compactTodos[key]?.length
        ? compactTodos[key].map((item) => item.text).join('\n')
        : '';
    cell.onclick = visible
      ? () => chrome.tabs.create({ url: chrome.runtime.getURL('calendar_full.html') })
      : null;
  }
}

document.querySelector('.left_btn').addEventListener('click', () => {
  compactMonth.setMonth(compactMonth.getMonth() - 1);
  renderCompactCalendar();
});
document.querySelector('.right_btn').addEventListener('click', () => {
  compactMonth.setMonth(compactMonth.getMonth() + 1);
  renderCompactCalendar();
});
(globalThis.browser || globalThis.chrome).runtime
  .sendMessage({ target: 'worker', type: 'get' })
  .then((result) => {
    compactTodos = result?.data?.todos || {};
    renderCompactCalendar();
  });
