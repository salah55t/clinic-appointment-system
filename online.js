/* تسجيل الإنترنت — يحفظ محلياً كحل احتياطي. للبيانات المشتركة بين الأجهزة اربطه بخادم API أو Firebase. */
const ONLINE_STORAGE_KEY = 'clinic-system-data';

function readOnlineData() {
  try {
    const data = JSON.parse(localStorage.getItem(ONLINE_STORAGE_KEY));
    return data && Array.isArray(data.appointments) ? data : { appointments: [], patients: [], queue: [] };
  } catch {
    return { appointments: [], patients: [], queue: [] };
  }
}

function saveOnlineData(data) {
  localStorage.setItem(ONLINE_STORAGE_KEY, JSON.stringify(data));
}

function makeId(prefix) {
  const random = window.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
  return `${prefix}-${Date.now()}-${random.slice(0, 8).toUpperCase()}`;
}

function getNextQueueNumber(data) {
  const active = data.queue.filter((item) => item.status !== 'completed');
  return active.reduce((max, item) => Math.max(max, Number(item.position) || 0), 0) + 1;
}

function renderOnlineBarcode(value) {
  const box = document.getElementById('onlineBarcode');
  if (!box || typeof JsBarcode === 'undefined') return;
  box.innerHTML = '<svg id="onlineBarcodeSvg" aria-label="كود الحجز"></svg>';
  JsBarcode('#onlineBarcodeSvg', value, {
    format: 'CODE128', width: 2, height: 70, displayValue: true, margin: 10
  });
}

function setupOnlineRegistration() {
  const form = document.getElementById('onlineBookingForm');
  if (!form) return;

  const date = document.getElementById('onlineDate');
  date.min = new Date().toISOString().split('T')[0];

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const data = readOnlineData();
    const booking = {
      id: makeId('APP'), barcode: makeId('BAR'),
      patientName: document.getElementById('onlineName').value.trim(),
      patientPhone: document.getElementById('onlinePhone').value.trim(),
      patientEmail: document.getElementById('onlineEmail').value.trim(),
      examType: document.getElementById('onlineExam').value,
      appointmentDate: date.value,
      appointmentTime: document.getElementById('onlineTime').value,
      notes: document.getElementById('onlineNotes').value.trim(),
      status: 'waiting', createdAt: new Date().toISOString()
    };

    if (data.appointments.some((item) => item.patientPhone === booking.patientPhone && item.appointmentDate === booking.appointmentDate && item.status !== 'cancelled')) {
      alert('يوجد حجز مسجل لهذا الهاتف في التاريخ نفسه.');
      return;
    }

    booking.queueNumber = getNextQueueNumber(data);
    data.appointments.push(booking);
    data.queue.push({
      id: makeId('Q'), appointmentId: booking.id, patientName: booking.patientName,
      phone: booking.patientPhone, position: booking.queueNumber, status: 'waiting',
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    });

    let patient = data.patients.find((item) => item.phone === booking.patientPhone);
    if (!patient) {
      patient = { id: makeId('PAT'), name: booking.patientName, phone: booking.patientPhone, email: booking.patientEmail, appointments: [] };
      data.patients.push(patient);
    }
    patient.appointments = Array.isArray(patient.appointments) ? patient.appointments : [];
    patient.appointments.push(booking.id);
    saveOnlineData(data);

    document.getElementById('onlineBookingId').textContent = booking.id;
    document.getElementById('onlineQueueNumber').textContent = booking.queueNumber;
    document.getElementById('onlineResult').classList.remove('hidden');
    renderOnlineBarcode(booking.barcode);
    form.reset();
    date.min = new Date().toISOString().split('T')[0];
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  });

  document.getElementById('printBooking')?.addEventListener('click', () => window.print());
}

document.addEventListener('DOMContentLoaded', setupOnlineRegistration);
