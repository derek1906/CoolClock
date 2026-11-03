// The original statistics page, backed by extension storage instead of WebSQL.
var statsApi = globalThis.browser || globalThis.chrome;
let statsData;

async function statsRequest(type, payload = {}) {
  const response = await statsApi.runtime.sendMessage({ target: 'worker', type, ...payload });
  if (!response?.ok) throw Error(response?.error || type);
  return response.data;
}

function statsDuration(ms) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(seconds / 3600);
  return `${hours ? `${hours}:` : ''}${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function showDetails(title, records) {
  const dialog = document.createElement('dialog');
  dialog.style.cssText =
    'border:0;border-radius:5px;box-shadow:0 8px 40px #0005;padding:20px;max-width:90vw';
  const heading = document.createElement('h3');
  heading.textContent = title;
  const table = document.createElement('table');
  table.className = 'table table-striped';
  const head = document.createElement('thead');
  const labels = document.createElement('tr');
  for (const label of ['Start', 'End', 'Total Usage Time']) {
    const cell = document.createElement('th');
    cell.textContent = label;
    labels.append(cell);
  }
  head.append(labels);
  table.append(head);
  const body = document.createElement('tbody');
  for (const record of records) {
    const row = document.createElement('tr');
    for (const value of [
      new Date(record.start).toLocaleString(),
      new Date(record.end).toLocaleString(),
      statsDuration(record.end - record.start)
    ]) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    }
    body.append(row);
  }
  table.append(body);
  const close = document.createElement('button');
  close.className = 'btn btn-default';
  close.textContent = t('close');
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => dialog.remove());
  dialog.append(heading, table, close);
  document.body.append(dialog);
  dialog.showModal();
}

function drawUsage(records) {
  const root = d3.select('#timeUsage');
  root.selectAll('*').remove();
  const svg = root.append('svg').attr('width', 360).attr('height', 350);
  svg.append('text').attr('x', 15).attr('y', 20).text('Browser Usage Time');
  if (records.length < 5) {
    svg
      .append('text')
      .attr('x', 180)
      .attr('y', 165)
      .attr('text-anchor', 'middle')
      .text('Not enough data.');
    return;
  }
  const histogram = d3
    .bin()
    .value((record) => (record.end - record.start) / 3_600_000)
    .thresholds(10);
  const bins = histogram(records);
  const x = d3
    .scaleLinear()
    .domain([bins[0].x0, bins.at(-1).x1])
    .range([35, 345]);
  const y = d3
    .scaleSqrt()
    .domain([0, d3.max(bins, (bin) => bin.length) || 1])
    .range([315, 35]);
  const bars = svg.selectAll('.bar').data(bins).enter().append('g').attr('class', 'bar');
  bars
    .append('rect')
    .attr('x', (bin) => x(bin.x0) + 1)
    .attr('y', (bin) => y(bin.length))
    .attr('width', (bin) => Math.max(1, x(bin.x1) - x(bin.x0) - 2))
    .attr('height', (bin) => 315 - y(bin.length));
  bars
    .append('text')
    .attr('x', (bin) => (x(bin.x0) + x(bin.x1)) / 2)
    .attr('y', (bin) => y(bin.length) + 15)
    .attr('text-anchor', 'middle')
    .text((bin) => bin.length || '');
  bars.on('click', (_event, bin) => showDetails('Browser Usage Time Details', bin));
  svg
    .append('g')
    .attr('class', 'x axis')
    .attr('transform', 'translate(0,315)')
    .call(d3.axisBottom(x).ticks(6));
  svg.append('text').attr('x', 320).attr('y', 345).text('hours');
}

function drawHours(target, title, records, timestamp) {
  const root = d3.select(target);
  root.selectAll('*').remove();
  const svg = root.append('svg').attr('width', 360).attr('height', 350).attr('class', 'pie');
  svg.append('text').attr('x', 10).attr('y', 20).text(title);
  if (!records.length) {
    svg
      .append('text')
      .attr('x', 180)
      .attr('y', 165)
      .attr('text-anchor', 'middle')
      .text('Not enough data.');
    return;
  }
  const groups = d3.range(24).map((hour) => ({
    hour,
    records: records.filter((record) => new Date(timestamp(record)).getHours() === hour)
  }));
  const pie = d3
    .pie()
    .sort(null)
    .value((group) => group.records.length)(groups)
    .filter((slice) => slice.value);
  const arc = d3.arc().innerRadius(45).outerRadius(150);
  const graph = svg.append('g').attr('transform', 'translate(180,180)');
  const slices = graph.selectAll('.arc').data(pie).enter().append('g').attr('class', 'arc');
  slices
    .append('path')
    .attr('d', arc)
    .on('click', (_event, slice) =>
      showDetails(`${title} (${slice.data.hour}:00)`, slice.data.records)
    );
  slices
    .append('text')
    .attr('transform', (slice) => `translate(${arc.centroid(slice)})`)
    .attr('text-anchor', 'middle')
    .text((slice) => (slice.endAngle - slice.startAngle > 0.2 ? `${slice.data.hour}:00` : ''));
}

function renderStats() {
  const records = statsData.history.filter((entry) => entry.end > entry.start);
  document.getElementById('sessionStartTime').textContent = statsData.start
    ? new Date(statsData.start).toLocaleString()
    : '—';
  document.getElementById('graphDisableBtn').textContent = statsData.enabled ? 'Disable' : 'Enable';
  document.getElementById('graphs').style.display = statsData.enabled ? '' : 'none';
  if (statsData.enabled) {
    drawUsage(records);
    drawHours('#startTime', 'Browser Start Time', records, (record) => record.start);
    drawHours('#closeTime', 'Browser Close Time', records, (record) => record.end);
  }
}

async function initStats() {
  await loadClockLanguage();
  document.querySelectorAll('[trans]').forEach((node) => {
    node.textContent = t(node.getAttribute('trans'));
  });
  document.getElementById('timezone').textContent =
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  const updateClock = () => {
    document.getElementById('currentTime').textContent = new Date().toLocaleString();
    document.getElementById('uptime').textContent = statsData?.start
      ? statsDuration(Date.now() - statsData.start)
      : '—';
  };
  statsData = await statsRequest('get-stats');
  renderStats();
  updateClock();
  setInterval(updateClock, 1000);
  document.getElementById('graphDisableBtn').addEventListener('click', async () => {
    await statsRequest('set-stats-enabled', { enabled: !statsData.enabled });
    statsData = await statsRequest('get-stats');
    renderStats();
  });
  document.getElementById('graphResetBtn').addEventListener('click', async () => {
    if (!confirm('Reset usage data?')) return;
    await statsRequest('clear-stats');
    statsData = await statsRequest('get-stats');
    renderStats();
  });
}
initStats().catch((error) => {
  document.getElementById('graphs').textContent = error.message;
});
