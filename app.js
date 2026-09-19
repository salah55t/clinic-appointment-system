const STORAGE_KEY = 'clinic-system-data';

let clinicData = loadData();

function loadData() {
  const defaultData = {
    appointments: [],
    patients: [],
    queue: [],
    settings: {
      clinicName: 'عيادة أمان',
      openTime: '08:00',
      closeTime: '17:00',
      visitDuration: 15,
      maxPatients: 50,
    },
  };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved || defaultData;
  } catch {
    return defaultData;
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clinicData));
}

function generateBookingCode() {
  return `APP-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
}

function renderNavigation() {
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
      const pageId = btn.dataset.page;
      const targetPage = document.getElementById(pageId);
      if (targetPage) targetPage.classList.add('active');
    });
  });
}

function renderTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((t) => t.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach((tab) => tab.classList.remove('active'));
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');
    });
  });
}

function getPatientByPhone(phone) {
  return clinicData.patients.find((p) => p.phone === phone);
}

function createPatient(data) {
  const name = data.patientName;
  const phone = data.patientPhone;
  const email = data.patientEmail || '';

  let patient = getPatientByPhone(phone);
  if (!patient) {
    patient = {
      id: `PAT-${Date.now()}`,
      name,
      phone,
      email,
      appointments: [],
    };
    clinicData.patients.push(patient);
  }

  patient.name = name;
  patient.email = email;
  return patient;
}

function handleBookingSubmit(event) {
  event.preventDefault();

  const appointment = {
    id: generateBookingCode(),
    patientName: document.getElementById('patientName').value.trim(),
    patientPhone: document.getElementById('patientPhone').value.trim(),
    patientEmail: document.getElementById('patientEmail').value.trim(),
    examType: document.getElementById('examType').value,
    appointmentDate: document.getElementById('appointmentDate').value,
    appointmentTime: document.getElementById('appointmentTime').value,
    notes: document.getElementById('notes').value.trim(),
    status: 'pending',
    barcode: `B-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
  };

  if (!appointment.patientName || !appointment.patientPhone || !appointment.appointmentDate || !appointment.appointmentTime) {
    alert('يرجى تعبئة جميع الحقول المطلوبة.');
    return;
  }

  const patient = createPatient(appointment);
  patient.appointments.push(appointment.id);
  clinicData.appointments.push(appointment);
  saveData();

  document.getElementById('bookingForm').reset();
  showBookingResult(appointment);
  renderAdminTables();
  renderQueue();
}

function showBookingResult(appointment) {
  const bookingResult = document.getElementById('bookingResult');
  bookingResult.classList.remove('hidden');
  document.getElementById('bookingCodeText').textContent = appointment.id;

  const box = document.getElementById('barcodeBox');
  box.innerHTML = '';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('id', 'bookingBarcode');
  box.appendChild(svg);

  JsBarcode('#bookingBarcode', appointment.barcode, {
    format: 'CODE128',
    width: 2,
    height: 72,
    displayValue: true,
  });
}

function renderQueue() {
  const queueBody = document.getElementById('queueTableBody');
  queueBody.innerHTML = '';

  const waitingList = clinicData.queue.filter((item) => item.status === 'waiting');
  const servingList = clinicData.queue.filter((item) => item.status === 'serving');
  const completed = clinicData.queue.filter((item) => item.status === 'completed');

  document.getElementById('waitingCount').textContent = waitingList.length;
  document.getElementById('servingCount').textContent = servingList.length;
  document.getElementById('completedCount').textContent = completed.length;

  if (servingList.length > 0) {
    const current = servingList[0];
    document.getElementById('currentPatientBox').textContent = `جاري الفحص: ${current.patientName} | الدور: ${current.position}`;
  } else {
    document.getElementById('currentPatientBox').textContent = 'لا يوجد مريض جاري فحصه الآن';
  }

  clinicData.queue.forEach((item) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.position}</td>
      <td>${item.patientName}</td>
      <td>${item.time}</td>
      <td>${statusLabel(item.status)}</td>
    `;
    queueBody.appendChild(row);
  });

  updateAdminStats();
}

function statusLabel(status) {
  const labels = {
    waiting: 'في الانتظار',
    serving: 'قيد الفحص',
    completed: 'مكتمل',
  };
  return labels[status] || status;
}

function addToQueue(patientName, phone) {
  const existing = clinicData.queue.find((item) => item.phone === phone && item.status !== 'completed');
  if (existing) return existing;

  const item = {
    id: `Q-${Date.now()}`,
    patientName,
    phone,
    status: 'waiting',
    time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    position: clinicData.queue.length + 1,
  };

  clinicData.queue.push(item);
  saveData();
  renderQueue();
  return item;
}

function nextPatient() {
  const waiting = clinicData.queue.find((item) => item.status === 'waiting');
  if (!waiting) return;

  clinicData.queue.forEach((item) => {
    if (item.status === 'serving') item.status = 'completed';
  });

  waiting.status = 'serving';
  waiting.position = 1;

  clinicData.queue
    .filter((item) => item.id !== waiting.id && item.status === 'waiting')
    .forEach((item, index) => {
      item.position = index + 1;
    });

  saveData();
  renderQueue();
}

function completePatient() {
  const serving = clinicData.queue.find((item) => item.status === 'serving');
  if (!serving) return;

  serving.status = 'completed';
  clinicData.queue
    .filter((item) => item.status === 'waiting')
    .forEach((item, index) => {
      item.position = index + 1;
    });

  saveData();
  renderQueue();
}

function setupScanner() {
  const video = document.getElementById('scannerVideo');
  const startBtn = document.getElementById('startScannerBtn');
  const stopBtn = document.getElementById('stopScannerBtn');
  const scanResult = document.getElementById('scanResult');
  const confirmArrivalBtn = document.getElementById('confirmArrivalBtn');

  let stream = null;

  startBtn.addEventListener('click', async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('الكاميرا غير مدعومة في هذا المتصفح. أدخل الكود يدويًا.');
      const manualCode = prompt('أدخل رقم الحجز:');
      if (manualCode) handleScannedCode(manualCode);
      return;
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      video.srcObject = stream;
      video.play();
      setTimeout(() => {
        const code = prompt('أدخل رقم الحجز أو كود الباركود:');
        if (code) handleScannedCode(code);
      }, 1200);
    } catch {
      const manualCode = prompt('تعذر فتح الكاميرا. أدخل رقم الحجز:');
      if (manualCode) handleScannedCode(manualCode);
    }
  });

  stopBtn.addEventListener('click', () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    video.srcObject = null;
  });

  confirmArrivalBtn.addEventListener('click', () => {
    scanResult.classList.add('hidden');
    alert('تم تأكيد حضور المريض بنجاح.');
  });
}

function handleScannedCode(code) {
  const appointment = clinicData.appointments.find((item) => item.id === code || item.barcode === code);

  if (!appointment) {
    alert('كود غير صحيح أو غير موجود.');
    return;
  }

  const queueEntry = addToQueue(appointment.patientName, appointment.patientPhone);
  document.getElementById('scanResult').classList.remove('hidden');
  document.getElementById('scannedPatientName').textContent = appointment.patientName;
  document.getElementById('scannedQueueNumber').textContent = queueEntry.position;

  appointment.status = 'arrived';
  saveData();
}

function renderPatientsTable() {
  const tbody = document.getElementById('patientsTableBody');
  tbody.innerHTML = '';

  clinicData.patients.forEach((patient) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${patient.name}</td>
      <td>${patient.phone}</td>
      <td>${patient.email || '-'}</td>
      <td>${patient.appointments.length}</td>
      <td>
        <button class="secondary-btn" onclick="alert('تعديل المريض قيد التطوير')">تعديل</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function renderAppointmentsTable() {
  const tbody = document.getElementById('appointmentsTableBody');
  tbody.innerHTML = '';

  clinicData.appointments.forEach((item) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.id}</td>
      <td>${item.patientName}</td>
      <td>${item.appointmentDate} ${item.appointmentTime}</td>
      <td>${item.examType}</td>
      <td>${item.status === 'pending' ? 'معلق' : item.status}</td>
      <td>
        <button class="secondary-btn" onclick="cancelAppointment('${item.id}')">إلغاء</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function cancelAppointment(id) {
  const item = clinicData.appointments.find((a) => a.id === id);
  if (!item) return;
  item.status = 'cancelled';
  saveData();
  renderAppointmentsTable();
  renderAdminStats();
}

function renderAdminTables() {
  renderPatientsTable();
  renderAppointmentsTable();
}

function updateAdminStats() {
  document.getElementById('totalPatientsStat').textContent = clinicData.patients.length;
  document.getElementById('todayAppointmentsStat').textContent = clinicData.appointments.filter(
    (a) => a.appointmentDate === new Date().toISOString().split('T')[0]
  ).length;

  const avgWait = Math.max(5, Math.round(clinicData.queue.length * 2.5));
  document.getElementById('avgWaitStat').textContent = `${avgWait} د`;

  const completion = clinicData.queue.length === 0
    ? 0
    : Math.round((clinicData.queue.filter((q) => q.status === 'completed').length / clinicData.queue.length) * 100);

  document.getElementById('completionRateStat').textContent = `${completion}%`;
  renderChart();
}

function renderChart() {
  const ctx = document.getElementById('clinicChart');
  if (!ctx) return;

  const labels = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
  const data = [5, 8, 6, 10, 4, 7, 9];

  // destroy prior chart to avoid duplicate canvases
  if (window.clinicChartInstance) {
    window.clinicChartInstance.destroy();
  }

  window.clinicChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'المواعيد',
        data,
        backgroundColor: ['#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#0f172a'],
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

function loadSettings() {
  const s = clinicData.settings;
  const clinicNameInput = document.getElementById('clinicNameInput');
  if (clinicNameInput) clinicNameInput.value = s.clinicName;
  const openTimeInput = document.getElementById('openTimeInput');
  if (openTimeInput) openTimeInput.value = s.openTime;
  const closeTimeInput = document.getElementById('closeTimeInput');
  if (closeTimeInput) closeTimeInput.value = s.closeTime;
  const visitDurationInput = document.getElementById('visitDurationInput');
  if (visitDurationInput) visitDurationInput.value = s.visitDuration;
  const maxPatientsInput = document.getElementById('maxPatientsInput');
  if (maxPatientsInput) maxPatientsInput.value = s.maxPatients;
}

document.getElementById('bookingForm')?.addEventListener('submit', handleBookingSubmit);
document.getElementById('nextPatientBtn')?.addEventListener('click', nextPatient);
document.getElementById('completePatientBtn')?.addEventListener('click', completePatient);
document.getElementById('downloadBarcodeBtn')?.addEventListener('click', () => {
  const svg = document.querySelector('#bookingBarcode');
  if (!svg) return;

  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svg);
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'appointment-barcode.svg';
  link.click();
  URL.revokeObjectURL(url);
});

document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
  clinicData.settings = {
    clinicName: document.getElementById('clinicNameInput').value || 'عيادة أمان',
    openTime: document.getElementById('openTimeInput').value || '08:00',
    closeTime: document.getElementById('closeTimeInput').value || '17:00',
    visitDuration: Number(document.getElementById('visitDurationInput').value || 15),
    maxPatients: Number(document.getElementById('maxPatientsInput').value || 50),
  };

  saveData();
  alert('تم حفظ الإعدادات بنجاح.');
});

function seedDemoData() {
  clinicData = {
    appointments: [{
      id: 'APP-1001',
      patientName: 'أحمد علي',
      patientPhone: '0501000001',
      patientEmail: 'ahmed@test.com',
      examType: 'فحص عام',
      appointmentDate: new Date().toISOString().split('T')[0],
      appointmentTime: '09:30',
      notes: 'متابعة',
      status: 'pending',
      barcode: 'B-ABC123',
    }],
    patients: [{
      id: 'PAT-1001',
      name: 'أحمد علي',
      phone: '0501000001',
      email: 'ahmed@test.com',
      appointments: ['APP-1001'],
    }],
    queue: [{
      id: 'Q-1001',
      patientName: 'أحمد علي',
      phone: '0501000001',
      status: 'waiting',
      time: '09:30',
      position: 1,
    }],
    settings: {
      clinicName: 'عيادة أمان',
      openTime: '08:00',
      closeTime: '17:00',
      visitDuration: 15,
      maxPatients: 50,
    },
  };

  saveData();
  renderQueue();
  renderAdminTables();
  loadSettings();
}

document.addEventListener('DOMContentLoaded', () => {
  renderNavigation();
  renderTabs();
  setupScanner();
  renderQueue();
  renderAdminTables();
  updateAdminStats();
  loadSettings();

  // إزالة هذا السطر لو لم ترغب في بيانات تجريبية
  // seedDemoData();
});
