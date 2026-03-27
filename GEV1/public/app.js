// ============================================================
//  GE-Vernona Main Application Controller
//  Session Management & Authentication
// ============================================================

let currentUser = null;
let isAuthenticated = false;

// Check if user is authenticated on page load
async function checkSession() {
  const spinner = document.getElementById("loadingSpinner");
  spinner.style.display = "flex";

  try {
    const resp = await fetch("/api/auth/session", { method: "GET" });
    const data = await resp.json();

    if (data.authenticated) {
      isAuthenticated = true;
      currentUser = data.user;
      showDashboard();
      loadDashboardData();
    } else {
      isAuthenticated = false;
      showLogin();
    }
  } catch (err) {
    console.error("Session check failed:", err);
    showLogin();
  } finally {
    spinner.style.display = "none";
  }
}

// Show login screen
function showLogin() {
  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("dashboardScreen").style.display = "none";
  document.getElementById("loadingSpinner").style.display = "none";
}

// Show dashboard
function showDashboard() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("dashboardScreen").style.display = "grid";
  updateUserDisplay();
  setupNavigation();
  applyRolePermissions();
}

// Handle login
async function handleLogin(event) {
  event.preventDefault();

  const role = document.getElementById("roleSelect").value;
  const password = document.getElementById("passwordInput").value;
  const errorDiv = document.getElementById("loginError");

  if (!role) {
    errorDiv.textContent = "Please select a role";
    errorDiv.style.display = "block";
    return;
  }

  try {
    const resp = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, password }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      errorDiv.textContent = data.error || "Login failed";
      errorDiv.style.display = "block";
      return;
    }

    // Login successful
    isAuthenticated = true;
    currentUser = data.user;
    errorDiv.style.display = "none";

    // Clear form
    document.getElementById("loginForm").reset();
    document.getElementById("passwordInput").value = "123456";

    // Show dashboard
    showDashboard();
    loadDashboardData();
  } catch (err) {
    errorDiv.textContent = "Connection error: " + err.message;
    errorDiv.style.display = "block";
  }
}

// Handle logout
async function handleLogout(event) {
  if (event) event.preventDefault();

  if (!confirm("Are you sure you want to logout?")) {
    return;
  }

  try {
    const resp = await fetch("/api/auth/logout", { method: "POST" });

    if (resp.ok) {
      isAuthenticated = false;
      currentUser = null;
      showLogin();
      // Clear any stored data
      localStorage.removeItem("active_view");
    }
  } catch (err) {
    console.error("Logout error:", err);
    showLogin();
  }
}

// Update user display
function updateUserDisplay() {
  if (currentUser && currentUser.role) {
    document.getElementById("userDisplay").textContent =
      `Role: ${currentUser.role.toUpperCase()}`;
  }
}

// Update clock
function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const timeEl = document.getElementById("currentTime");
  if (timeEl) timeEl.textContent = time;
}

// Toggle sidebar on mobile
function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  sidebar.classList.toggle("mobile-open");
}

// Setup navigation
function setupNavigation() {
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const view = link.dataset.view;
      if (view) switchView(view);
    });
  });
}

// Switch between views
function switchView(view) {
  // Hide all views
  document.querySelectorAll(".view-content").forEach((el) => {
    el.style.display = "none";
  });

  // Show selected view
  const viewEl = document.getElementById(`view-${view}`);
  if (viewEl) viewEl.style.display = "block";

  // Update active nav link
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.view === view);
  });

  // Update page title
  const titles = {
    dashboard: "Dashboard",
    registration: "Employee Registration",
    directory: "Employee Directory",
  };
  document.querySelector(".page-title").textContent =
    titles[view] || "Dashboard";

  // Save view preference
  localStorage.setItem("active_view", view);

  // Load data for each view
  if (view === "dashboard") {
    loadDashboardData();
  }
}

// Apply role-based permissions
function applyRolePermissions() {
  const isWFM = currentUser.role === "wfm";

  document.getElementById("regMenu").style.display = isWFM
    ? "list-item"
    : "none";
  document.getElementById("dirMenu").style.display = isWFM
    ? "list-item"
    : "none";
}

// ============================================================
//  Dashboard Loading (existing functions from script.js)
// ============================================================

let employees = [];
let attendance = {};
let attritions = [];

async function loadDashboardData() {
  try {
    await Promise.all([loadEmployees(), loadAttendance(), loadAttritions()]);
    initDashboard();
    renderData();
  } catch (err) {
    console.error("Failed to load dashboard data:", err);
  }
}

async function loadEmployees() {
  try {
    const resp = await fetch("/api/employees");
    if (!resp.ok) throw new Error(`Failed to load employees: ${resp.status}`);
    const data = await resp.json();
    employees = data.map((emp) => ({ ...emp }));
    console.log("✅ Loaded", employees.length, "employees");
  } catch (err) {
    console.error("Error loading employees:", err);
    employees = [];
  }
}

async function loadAttendance() {
  try {
    const resp = await fetch("/api/attendance");
    if (!resp.ok) throw new Error(`Failed to load attendance: ${resp.status}`);
    const records = await resp.json();
    attendance = {};
    records.forEach((rec) => {
      if (!attendance[rec.date]) attendance[rec.date] = {};
      if (rec.status) attendance[rec.date][rec.empId] = rec.status;
    });
  } catch (err) {
    console.error("Error loading attendance:", err);
    attendance = {};
  }
}

async function loadAttritions() {
  try {
    const resp = await fetch("/api/attrition");
    if (!resp.ok) throw new Error(`Failed to load attritions: ${resp.status}`);
    attritions = await resp.json();
  } catch (err) {
    console.error("Error loading attritions:", err);
    attritions = [];
  }
}

// ============================================================
//  Dashboard Controls
// ============================================================

function formatLocalISO(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDateRange(from, to) {
  const arr = [];
  const cur = new Date(from);
  const end = new Date(to);
  cur.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  while (cur <= end) {
    arr.push(formatLocalISO(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return arr;
}

function onDateModeChange() {
  const mode = document.getElementById("dateMode")?.value || "single";
  const singleInput = document.querySelector(".single-input");
  const rangeInputs = document.querySelectorAll(".range-input");

  if (mode === "single") {
    singleInput.style.display = "inline-block";
    rangeInputs.forEach((el) => (el.style.display = "none"));
    onSingleDateChange();
  } else {
    singleInput.style.display = "none";
    rangeInputs.forEach((el) => (el.style.display = "inline-block"));
    const today = formatLocalISO(new Date());
    if (!document.getElementById("fromDate").value)
      document.getElementById("fromDate").value = today;
    if (!document.getElementById("toDate").value)
      document.getElementById("toDate").value = today;
    renderData();
  }
}

function onSingleDateChange() {
  const single = document.getElementById("singleDate")?.value;
  if (single) {
    if (document.getElementById("fromDate"))
      document.getElementById("fromDate").value = single;
    if (document.getElementById("toDate"))
      document.getElementById("toDate").value = single;
    renderData();
  }
}

function initDashboard() {
  const today = formatLocalISO(new Date());
  const fromEl = document.getElementById("fromDate");
  const toEl = document.getElementById("toDate");
  const singleEl = document.getElementById("singleDate");

  if (fromEl && !fromEl.value) fromEl.value = today;
  if (toEl && !toEl.value) toEl.value = today;
  if (singleEl && !singleEl.value) singleEl.value = today;

  const modeSelect = document.getElementById("dateMode");
  if (modeSelect) modeSelect.value = "single";
  onDateModeChange();
}

function isAttritedOnOrBefore(empId, isoDate) {
  const dates = attritions
    .filter((a) => a.empId === empId)
    .map((a) => a.date)
    .sort();
  const ad = dates.length ? dates[0] : null;
  return ad && ad <= isoDate;
}

function headcountOn(isoDate) {
  return employees.filter(
    (e) =>
      (e.hireDate ? e.hireDate <= isoDate : true) &&
      !isAttritedOnOrBefore(e.id, isoDate),
  ).length;
}

function computeAttrition(from, to) {
  const sepCount = attritions.filter(
    (a) => a.date >= from && a.date <= to,
  ).length;
  const opening = headcountOn(from);
  const closing = headcountOn(to);
  const avgHeadcount = Math.max((opening + closing) / 2, 1);
  return (sepCount / avgHeadcount) * 100;
}

let searchTerm = "";

function renderData() {
  const mode = document.getElementById("dateMode")?.value || "single";
  if (mode === "single") {
    const single = document.getElementById("singleDate")?.value;
    if (single) {
      const f = document.getElementById("fromDate");
      const t = document.getElementById("toDate");
      if (f) f.value = single;
      if (t) t.value = single;
    }
  }

  const from = document.getElementById("fromDate")?.value;
  const to = document.getElementById("toDate")?.value || from;
  const tableBody = document.getElementById("attendanceBody");

  if (!from || !to) {
    if (tableBody)
      tableBody.innerHTML =
        '<tr><td colspan="4" style="text-align:center; padding:20px;">Select From and To dates</td></tr>';
    return;
  }

  const dates = getDateRange(from, to);
  const statusOn = (d, id) => attendance[d]?.[id] || null;

  let baseEmps = employees.slice();
  if (currentUser.role === "tl") {
    const myTeam = localStorage.getItem("tl_team") || "Lead_Alpha";
    baseEmps = baseEmps.filter((e) => e.tl === myTeam);
  }
  baseEmps = baseEmps.filter((e) => !isAttritedOnOrBefore(e.id, to));

  let visibleEmps = baseEmps.slice();
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchTerm = searchInput.value?.toLowerCase() || "";
    if (searchTerm) {
      visibleEmps = visibleEmps.filter(
        (e) =>
          e.name.toLowerCase().includes(searchTerm) ||
          e.id.toLowerCase().includes(searchTerm) ||
          (e.tl || "").toLowerCase().includes(searchTerm),
      );
    }
  }

  const total = baseEmps.length;
  const daysCount = dates.length;
  const presentToday = baseEmps.reduce(
    (acc, e) => acc + (statusOn(to, e.id) === "Present" ? 1 : 0),
    0,
  );

  let uplDays = 0;
  let slDays = 0;
  const baseEmpSummary = baseEmps.map((e) => {
    let p = 0;
    let u = 0;
    let s = 0;
    dates.forEach((d) => {
      const st = statusOn(d, e.id);
      if (st === "Present") p++;
      else if (st === "UPL") u++;
      else if (st === "SL") s++;
    });
    uplDays += u;
    slDays += s;
    return { id: e.id, p, u, s };
  });

  const shrinkage =
    total === 0 || daysCount === 0
      ? 0
      : ((uplDays + slDays) / (total * daysCount)) * 100;

  document.getElementById("statTotal").textContent = total;
  const pct = total ? ((presentToday / total) * 100).toFixed(0) : "0";
  document.getElementById("statPresent").textContent =
    `${presentToday} (${pct}%)`;
  document.getElementById("statShrink").textContent =
    shrinkage.toFixed(1) + "%";
  const attrPct = computeAttrition(from, to);
  document.getElementById("statAttrition").textContent = isFinite(attrPct)
    ? attrPct.toFixed(1) + "%"
    : "0.0%";

  if (!tableBody) return;

  const summaryMap = new Map(baseEmpSummary.map((s) => [s.id, s]));
  tableBody.innerHTML = visibleEmps
    .map((emp) => {
      const sum = summaryMap.get(emp.id) || { p: 0, u: 0, s: 0 };
      const latestStatus = statusOn(to, emp.id) || "";
      const summary = `P:${sum.p} U:${sum.u} S:${sum.s}`;
      const title = dates
        .map((d) => `${d}: ${statusOn(d, emp.id) || "N/A"}`)
        .join("\n");
      const disabledAttr = isAttritedOnOrBefore(emp.id, to) ? "disabled" : "";

      if (currentUser.role === "wfm") {
        return `
          <tr>
            <td><strong>${emp.id}</strong></td>
            <td>${emp.name || ""}</td>
            <td><span class="badge">${emp.tl || "-"}</span></td>
            <td>
              <select onchange="markAttendance('${emp.id}', this.value)" class="status-select" title="${title}" ${disabledAttr}>
                <option value="">-- Select --</option>
                <option value="Present" ${latestStatus === "Present" ? "selected" : ""}>Present</option>
                <option value="UPL" ${latestStatus === "UPL" ? "selected" : ""}>UPL</option>
                <option value="SL" ${latestStatus === "SL" ? "selected" : ""}>SL</option>
                <option value="Left">Left (Attrition)</option>
              </select>
            </td>
          </tr>
        `;
      } else {
        return `
          <tr>
            <td><strong>${emp.id}</strong></td>
            <td>${emp.name || ""}</td>
            <td><span class="badge">${emp.tl || "-"}</span></td>
            <td><span class="badge secondary" title="${title}">${summary} (${latestStatus || "N/A"})</span></td>
          </tr>
        `;
      }
    })
    .join("");
}

async function markAttendance(empId, status) {
  const to =
    document.getElementById("toDate")?.value || formatLocalISO(new Date());

  if (status === "Left") {
    const emp = employees.find((e) => e.id === empId);
    const name = emp ? ` ${emp.name}` : "";
    if (
      !confirm(
        `Mark${name} as attrited on ${to}? This will lock further updates.`,
      )
    ) {
      return;
    }

    try {
      await fetch("/api/attrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empId, date: to }),
      });
      attritions.push({ empId, date: to });
      status = "";
    } catch (err) {
      alert("Failed to record attrition");
      return;
    }
  }

  try {
    await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empId, date: to, status: status || "" }),
    });

    if (!attendance[to]) attendance[to] = {};
    if (!status) {
      delete attendance[to][empId];
    } else {
      attendance[to][empId] = status;
    }

    renderData();
  } catch (err) {
    alert("Failed to save attendance");
  }
}

function exportExcel() {
  if (typeof XLSX === "undefined") {
    alert("Excel export library not loaded");
    return;
  }

  const from = document.getElementById("fromDate")?.value;
  const to = document.getElementById("toDate")?.value || from;
  if (!from || !to) {
    alert("Select dates to export");
    return;
  }

  const dates = getDateRange(from, to);
  let baseEmps = employees.slice();
  if (currentUser.role === "tl") {
    const myTeam = localStorage.getItem("tl_team") || "Lead_Alpha";
    baseEmps = baseEmps.filter((e) => e.tl === myTeam);
  }

  const ws_data = [["Emp ID", "Name", "Team Lead", "Status", "Date"]];
  baseEmps.forEach((e) => {
    dates.forEach((d) => {
      ws_data.push([e.id, e.name, e.tl, attendance[d]?.[e.id] || "N/A", d]);
    });
  });

  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  XLSX.writeFile(wb, `Attendance_${from}_to_${to}.xlsx`);
}

// Search on input
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    let debounce;
    searchInput.addEventListener("input", (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        renderData();
      }, 200);
    });
  }
});
