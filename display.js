const DISPLAY_STORAGE_KEY = 'clinic-system-data';

function displayData() {
  try { return JSON.parse(localStorage.getItem(DISPLAY_STORAGE_KEY)) || { queue: [] }; }
  catch { return { queue: [] }; }
}

function renderDisplay() {
  const queue = displayData().queue || [];
  const serving = queue.find((item) => item.status === 'serving');
  const waiting = queue.filter((item) => item.status === 'waiting').sort((a, b) => a.position - b.position);
  document.getElementById('displayCurrentNumber').textContent = serving ? String(serving.position).padStart(2, '0') : '--';
  document.getElementById('displayCurrentName').textContent = serving ? serving.patientName : 'بانتظار بدء الفحص';
  document.getElementById('displayWaitingCount').textContent = `${waiting.length} مريض`;
  const list = document.getElementById('displayWaitingList');
  list.innerHTML = waiting.length ? waiting.slice(0, 12).map((item) => `<div class="waiting-item"><strong>${String(item.position).padStart(2, '0')}</strong><span>${item.patientName}</span></div>`).join('') : '<p class="empty-display">لا يوجد مرضى في الانتظار حالياً</p>';
}

function updateDisplayClock() {
  document.getElementById('displayClock').textContent = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

document.addEventListener('DOMContentLoaded', () => {
  renderDisplay();
  updateDisplayClock();
  setInterval(renderDisplay, 1500);
  setInterval(updateDisplayClock, 1000);
  window.addEventListener('storage', renderDisplay);
});
