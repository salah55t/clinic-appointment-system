/* شاشة الأدوار — تعمل محلياً، وتستعد للربط بقاعدة بيانات عند نشر الخادم. */
const DISPLAY_STORAGE_KEY = 'clinic-system-data';

function readDisplayData() {
  try {
    const data = JSON.parse(localStorage.getItem(DISPLAY_STORAGE_KEY));
    return data && Array.isArray(data.queue) ? data : { queue: [] };
  } catch {
    return { queue: [] };
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
}

function renderDisplay() {
  const queue = readDisplayData().queue;
  const serving = queue.find((item) => item.status === 'serving');
  const waiting = queue
    .filter((item) => item.status === 'waiting')
    .sort((a, b) => Number(a.position || 0) - Number(b.position || 0));

  const currentNumber = document.getElementById('displayCurrentNumber');
  const currentName = document.getElementById('displayCurrentName');
  const count = document.getElementById('displayWaitingCount');
  const list = document.getElementById('displayWaitingList');

  if (!currentNumber || !currentName || !count || !list) return;

  currentNumber.textContent = serving ? String(serving.position).padStart(2, '0') : '--';
  currentName.textContent = serving ? escapeHtml(serving.patientName) : 'بانتظار بدء الفحص';
  count.textContent = `${waiting.length} مريض`;
  list.innerHTML = waiting.length
    ? waiting.slice(0, 12).map((item) => `
        <div class="waiting-item">
          <strong>${String(item.position).padStart(2, '0')}</strong>
          <span>${escapeHtml(item.patientName)}</span>
        </div>`).join('')
    : '<p class="empty-display">لا يوجد مرضى في الانتظار حالياً</p>';
}

function updateDisplayClock() {
  const clock = document.getElementById('displayClock');
  if (clock) clock.textContent = new Date().toLocaleTimeString('ar-EG', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderDisplay();
  updateDisplayClock();
  window.setInterval(renderDisplay, 1500);
  window.setInterval(updateDisplayClock, 1000);
  window.addEventListener('storage', renderDisplay);
});
