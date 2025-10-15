/*
# README
- **Cách chạy:** Mở `index.html` trong trình duyệt.
- **Tính năng:** Giả lập đăng nhập, bảng chấm công với tìm kiếm, lọc phòng ban, thống kê trạng thái và xuất CSV.
- **Ghi chú:** Dữ liệu demo, không có bảo mật; không dùng tệp nhị phân, logo dùng SVG inline.
*/

const FALLBACK_DATA = [
  { name: "Nguyễn Văn A", department: "IT", checkIn: "08:15", checkOut: "17:00" },
  { name: "Trần Thị B", department: "Kế toán", checkIn: "08:00", checkOut: "17:00" },
  { name: "Lê Quốc C", department: "Nhân sự", checkIn: "—", checkOut: "—" },
  { name: "Phạm Minh D", department: "IT", checkIn: "08:05", checkOut: "17:10" },
  { name: "Võ Thị E", department: "Kế toán", checkIn: "08:45", checkOut: "17:30" },
  { name: "Đặng Gia F", department: "Nhân sự", checkIn: "08:10", checkOut: "17:05" },
  { name: "Bùi Hữu G", department: "IT", checkIn: "09:00", checkOut: "18:00" },
  { name: "Phan Thị H", department: "Kế toán", checkIn: "08:25", checkOut: "17:05" },
  { name: "Dương Minh I", department: "Nhân sự", checkIn: "—", checkOut: "—" },
  { name: "Lý Quốc K", department: "IT", checkIn: "08:20", checkOut: "17:15" },
  { name: "Tạ Thu L", department: "Kế toán", checkIn: "08:50", checkOut: "17:40" },
  { name: "Ngô Nhật M", department: "Nhân sự", checkIn: "08:00", checkOut: "17:00" }
];

let employees = [];
let filteredEmployees = [];

const elements = {};

async function loadData() {
  try {
    const response = await fetch('data/employees.json');
    if (!response.ok) {
      throw new Error('Không thể tải dữ liệu JSON');
    }
    const data = await response.json();
    return Array.isArray(data) ? data : FALLBACK_DATA;
  } catch (error) {
    console.warn('Không tải được data/employees.json. Sử dụng dữ liệu dự phòng.', error);
    return FALLBACK_DATA;
  }
}

function normalizeText(value) {
  if (!value) return '';
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .trim();
}

function computeStatus(record) {
  if (record.checkIn === '—' || record.checkOut === '—') {
    return 'Vắng';
  }
  const checkInMinutes = parseTimeToMinutes(record.checkIn);
  const lateThreshold = parseTimeToMinutes('08:30');
  return checkInMinutes > lateThreshold ? 'Đi trễ' : 'Đúng giờ';
}

function computeTotalHours(checkIn, checkOut) {
  if (checkIn === '—' || checkOut === '—') {
    return '—';
  }
  const inMinutes = parseTimeToMinutes(checkIn);
  const outMinutes = parseTimeToMinutes(checkOut);
  if (Number.isNaN(inMinutes) || Number.isNaN(outMinutes) || outMinutes < inMinutes) {
    return '—';
  }
  const diff = outMinutes - inMinutes;
  const hours = Math.floor(diff / 60).toString().padStart(2, '0');
  const minutes = (diff % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function parseTimeToMinutes(value) {
  const parts = value.split(':').map(Number);
  if (parts.length !== 2 || parts.some(Number.isNaN)) {
    return NaN;
  }
  const [hours, minutes] = parts;
  return hours * 60 + minutes;
}

function applyFilters() {
  const searchTerm = normalizeText(elements.searchInput.value);
  const department = elements.departmentFilter.value;

  filteredEmployees = employees.filter((record) => {
    const matchesSearch = normalizeText(record.name).includes(searchTerm);
    const matchesDepartment = department === 'all' || record.department === department;
    return matchesSearch && matchesDepartment;
  });

  renderTable(filteredEmployees);
  renderStats(filteredEmployees);
}

function renderTable(list) {
  const tbody = elements.tableBody;
  tbody.innerHTML = '';

  if (!list.length) {
    const emptyRow = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.textContent = 'Không có dữ liệu phù hợp.';
    cell.style.textAlign = 'center';
    cell.style.padding = '1.5rem';
    emptyRow.appendChild(cell);
    tbody.appendChild(emptyRow);
    return;
  }

  list.forEach((record) => {
    const row = document.createElement('tr');
    const status = computeStatus(record);
    const total = computeTotalHours(record.checkIn, record.checkOut);

    row.innerHTML = `
      <td>${record.name}</td>
      <td>${record.department}</td>
      <td>${record.checkIn}</td>
      <td>${record.checkOut}</td>
      <td>${total}</td>
      <td>
        <span class="status-cell ${statusClass(status)}">${status}</span>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function renderStats(list) {
  let onTime = 0;
  let late = 0;
  let absent = 0;

  list.forEach((record) => {
    const status = computeStatus(record);
    if (status === 'Đúng giờ') onTime += 1;
    else if (status === 'Đi trễ') late += 1;
    else absent += 1;
  });

  elements.statOnTime.textContent = `Đúng giờ: ${onTime}`;
  elements.statLate.textContent = `Đi trễ: ${late}`;
  elements.statAbsent.textContent = `Vắng: ${absent}`;
}

function statusClass(status) {
  switch (status) {
    case 'Đúng giờ':
      return 'status-on-time';
    case 'Đi trễ':
      return 'status-late';
    default:
      return 'status-absent';
  }
}

function exportCSV(list) {
  if (!list.length) {
    alert('Không có dữ liệu để xuất.');
    return;
  }

  const headers = ['Tên', 'Phòng ban', 'Giờ vào', 'Giờ ra', 'Tổng giờ', 'Trạng thái'];
  const rows = list.map((record) => [
    record.name,
    record.department,
    record.checkIn,
    record.checkOut,
    computeTotalHours(record.checkIn, record.checkOut),
    computeStatus(record)
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row
      .map((cell) => `"${cell.replace(/"/g, '""')}"`)
      .join(','))
    .join('\n');

  const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'bang-cham-cong.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function bindEvents() {
  elements.loginButton.addEventListener('click', () => {
    elements.loginScreen.hidden = true;
    elements.timesheetScreen.hidden = false;
  });

  elements.logoutButton.addEventListener('click', () => {
    elements.timesheetScreen.hidden = true;
    elements.loginScreen.hidden = false;
  });

  elements.searchInput.addEventListener('keyup', applyFilters);
  elements.departmentFilter.addEventListener('change', applyFilters);
  elements.exportButton.addEventListener('click', () => exportCSV(filteredEmployees));

  elements.rulesButton.addEventListener('click', () => {
    elements.modal.hidden = false;
  });

  elements.modalOverlay.addEventListener('click', () => {
    elements.modal.hidden = true;
  });

  elements.closeModalButton.addEventListener('click', () => {
    elements.modal.hidden = true;
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !elements.modal.hidden) {
      elements.modal.hidden = true;
    }
  });
}

function cacheElements() {
  elements.loginScreen = document.getElementById('login-screen');
  elements.timesheetScreen = document.getElementById('timesheet-screen');
  elements.loginButton = document.getElementById('login-button');
  elements.logoutButton = document.getElementById('logout-button');
  elements.searchInput = document.getElementById('search-input');
  elements.departmentFilter = document.getElementById('department-filter');
  elements.exportButton = document.getElementById('export-button');
  elements.rulesButton = document.getElementById('rules-button');
  elements.tableBody = document.querySelector('#timesheet-table tbody');
  elements.statOnTime = document.getElementById('stat-on-time');
  elements.statLate = document.getElementById('stat-late');
  elements.statAbsent = document.getElementById('stat-absent');
  elements.modal = document.getElementById('rules-modal');
  elements.modalOverlay = elements.modal.querySelector('.modal-overlay');
  elements.closeModalButton = document.getElementById('close-modal');
}

async function init() {
  cacheElements();
  bindEvents();

  employees = await loadData();
  applyFilters();

  elements.loginScreen.hidden = false;
  elements.timesheetScreen.hidden = true;
  elements.searchInput.value = '';
  elements.departmentFilter.value = 'all';
}

document.addEventListener('DOMContentLoaded', init);
