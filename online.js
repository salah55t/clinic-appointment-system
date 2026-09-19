/* Shared online registration helpers. Add Firebase config in firebase-config.js for multi-device sync. */
const ONLINE_STORAGE_KEY = 'clinic-system-data';
const getOnlineData = () => {
  try {
    return JSON.parse(localStorage.getItem(ONLINE_STORAGE_KEY)) || { appointments: [], patients: [], queue: [] };
  } catch { return { appointments: [], patients: [], queue: [] }; }
};
const saveOnlineData = (data) => localStorage.setItem(ONLINE_STORAGE_KEY, JSON.stringify(data));
const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;

function getNextQueueNumber(data) {
  return data.queue.filter((item) => item.status !== 'completed').length + 1;
}

function renderOnlineBarcode(value) {
  const box = document.getElementById('onlineBarcode');
  if (!box || typeof JsBarcode === 'undefined') return;
  box.innerHTML = '<svg id="onlineBarcodeSvg"></svg>';
  JsBarcode('#onlineBarcodeSvg', value, { format: 'CODE128', width: 2, height: 70, displayValue: true });
}

function setupOnlineRegistration() {
  const form = document.getElementById('onlineBookingForm');
  if (!form) return;
  const date = document.getElementById('onlineDate');
  date.min = new Date().toISOString().split('T')[0];

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = getOnlineData();
    const booking = {
      id: makeId('APP'),
      barcode: makeId('BAR'),
      patientName: document.getElementById('onlineName').value.trim(),
      patientPhone: document.getElementById('onlinePhone').value.trim(),
      patientEmail: document.getElementById('onlineEmail').value.trim(),
      examType: document.getElementById('onlineExam').value,
      appointmentDate: date.value,
      appointmentTime: document.getElementById('onlineTime').value,
      notes: document.getElementById('onlineNotes').value.trim(),
      status: 'waiting',
      createdAt: new Date().toISOString()
    };
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
