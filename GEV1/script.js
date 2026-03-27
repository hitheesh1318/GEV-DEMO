/******** Utilities (Dates) ********/
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

/******** Data Stores ********/
let employees = [];
let attendance = {}; // { "YYYY-MM-DD": { "empId": "status", ... }, ... }
let attritions = [];
let currentUser = null;

const TL_TEAM_KEY = "tl_team";
if (!localStorage.getItem(TL_TEAM_KEY))
  localStorage.setItem(TL_TEAM_KEY, "Lead_Alpha");

let searchTerm = localStorage.getItem("search_term") || "";

// ---- API Helpers (Database) ----
async function loadEmployees() {
  try {
    const resp = await fetch("/api/employees");
    if (!resp.ok) throw new Error(`Failed to load employees: ${resp.status}`);
    const data = await resp.json();
    // Convert API format { id, name, tl, hireDate } to expected format
    employees = data.map((emp) => ({ ...emp }));
    console.log("✅ Employees loaded from database:", employees.length);
  } catch (err) {
    console.error("❌ Error loading employees:", err);
    employees = [];
  }
}

async function loadAttendance() {
  try {
    const resp = await fetch("/api/attendance");
    if (!resp.ok) throw new Error(`Failed to load attendance: ${resp.status}`);
    const records = await resp.json();
    // Convert flat array to nested object format: { "YYYY-MM-DD": { "empId": "status" } }
    attendance = {};
    records.forEach((rec) => {
      if (!attendance[rec.date]) attendance[rec.date] = {};
      if (rec.status) attendance[rec.date][rec.empId] = rec.status;
    });
    console.log("✅ Attendance loaded from database");
  } catch (err) {
    console.error("❌ Error loading attendance:", err);
    attendance = {};
  }
}

async function loadAttritions() {
  try {
    const resp = await fetch("/api/attrition");
    if (!resp.ok) throw new Error(`Failed to load attritions: ${resp.status}`);
    attritions = await resp.json();
    console.log("✅ Attritions loaded from database:", attritions.length);
  } catch (err) {
    console.error("❌ Error loading attritions:", err);
    attritions = [];
  }
}

async function saveAttendanceToAPI(empId, date, status) {
  try {
    const resp = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empId, date, status: status || "" }),
    });
    if (!resp.ok) throw new Error(`Failed to save attendance: ${resp.status}`);
    console.log(`✅ Attendance saved for ${empId} on ${date}`);
  } catch (err) {
    console.error("❌ Error saving attendance:", err);
    throw err;
  }
}

async function saveAttritionToAPI(empId, date) {
  try {
    const resp = await fetch("/api/attrition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empId, date }),
    });
    if (!resp.ok) throw new Error(`Failed to save attrition: ${resp.status}`);
    console.log(`✅ Attrition recorded for ${empId} on ${date}`);
  } catch (err) {
    console.error("❌ Error saving attrition:", err);
    throw err;
  }
}

// Legacy functions kept for backward compatibility (no longer save to localStorage)
function saveEmployees() {
  /* employees are managed via registration form API */
}
function saveAttendance() {
  /* attendance is saved to API via saveAttendanceToAPI */
}
function saveAttritions() {
  /* attritions are saved to API via saveAttritionToAPI */
}

/******** Attrition helpers ********/
function recordAttrition(empId, isoDate) {
  const exists = attritions.some(
    (a) => a.empId === empId && a.date === isoDate,
  );
  if (!exists) {
    attritions.push({ empId, date: isoDate });
    saveAttritionToAPI(empId, isoDate).catch((err) => {
      alert(`❌ Failed to record attrition: ${err.message}`);
      // Remove from local array if save failed
      attritions = attritions.filter(
        (a) => !(a.empId === empId && a.date === isoDate),
      );
    });
    renderData();
  }
}
function getAttritionDate(empId) {
  const dates = attritions
    .filter((a) => a.empId === empId)
    .map((a) => a.date)
    .sort();
  return dates.length ? dates[0] : null;
}
function isAttritedOnOrBefore(empId, isoDate) {
  const ad = getAttritionDate(empId);
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
  const opening = headcountOn(from),
    closing = headcountOn(to);
  const avgHeadcount = Math.max((opening + closing) / 2, 1);
  return (sepCount / avgHeadcount) * 100;
}

/******** Authentication ********/
function login() {
  currentUser = document.getElementById("roleSelect")?.value || "wfm";
  localStorage.setItem("current_user_role", currentUser);
  const overlay = document.getElementById("loginOverlay");
  if (overlay) overlay.style.display = "none";
  const userEl = document.getElementById("userName");
  if (userEl) userEl.innerText = (currentUser || "").toUpperCase();

  applyRoleVisibility();

  // Load data from API and initialize dashboard
  Promise.all([loadEmployees(), loadAttendance(), loadAttritions()])
    .then(() => {
      initDashboard();
      const lastView = localStorage.getItem("active_view") || "dashboard";
      if (!canAccessView(lastView)) {
        setView("dashboard");
      } else {
        setView(lastView);
      }
    })
    .catch((err) => {
      console.error("Failed to load data:", err);
      alert("⚠️ Failed to load data from server.");
    });
}
function logout() {
  localStorage.removeItem("current_user_role");
  location.reload();
}

/******** Role-based Access Control (NEW) ********/
const RESTRICTED_VIEWS = new Set(["registration", "directory"]);
function canAccessView(view) {
  if (!RESTRICTED_VIEWS.has(view)) return true;
  return currentUser === "wfm"; // only WFM can access registration/directory
}
function applyRoleVisibility() {
  const allowed = currentUser === "wfm";
  document
    .querySelectorAll(
      '.nav-link[data-view="registration"], .nav-link[data-view="directory"]',
    )
    .forEach((link) => {
      link.classList.toggle("disabled", !allowed);
      link.setAttribute("aria-disabled", String(!allowed));
      link.tabIndex = allowed ? 0 : -1;
    });
}

/******** View Switching (Dashboard / Registration / Directory) ********/
let frameLast = ""; // last src loaded in iframe
function setView(view) {
  // Enforce access every time
  if (!canAccessView(view)) {
    alert("Access denied: your role does not permit this section.");
    view = "dashboard";
  }

  localStorage.setItem("active_view", view);

  const dash = document.getElementById("view-dashboard");
  const frameWrap = document.getElementById("view-iframe");
  if (dash) dash.style.display = view === "dashboard" ? "block" : "none";
  if (frameWrap)
    frameWrap.style.display = view !== "dashboard" ? "block" : "none";

  // highlight nav
  document
    .querySelectorAll(".nav-link")
    .forEach((a) => a.classList.toggle("active", a.dataset.view === view));

  // hide dashboard-only controls in iframe views
  const dashControls = [
    document.getElementById("btnExportAttendance"),
    document.getElementById("dateMode"),
    document.getElementById("singleDate"),
    document.getElementById("fromDate"),
    document.getElementById("toDate"),
    document.getElementById("searchInput"),
  ];
  const isFrameView = view !== "dashboard";
  dashControls.forEach((el) => {
    if (!el) return;
    el.classList.toggle("hide", isFrameView);
    el.disabled = isFrameView;
  });

  // lazy load iframe src for allowed views
  const frame = document.getElementById("contentFrame");
  if (isFrameView && frame) {
    const src =
      view === "registration"
        ? "registration.html"
        : view === "directory"
          ? "directory.html"
          : "";
    if (src && frameLast !== src) {
      frame.src = src;
      frameLast = src;
    }
  }

  if (view === "dashboard") renderData();
}

/******** DOM Ready ********/
document.addEventListener("DOMContentLoaded", () => {
  // Sidebar toggle
  const sidebar = document.querySelector(".sidebar");
  const mainContent = document.querySelector(".main-content");
  const toggleBtn = document.querySelector(".toggle-btn");
  if (sidebar && mainContent && toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const isMobile = window.matchMedia("(max-width: 900px)").matches;
      if (isMobile) {
        sidebar.classList.toggle("mobile-open");
        sidebar.classList.remove("collapsed");
        mainContent.classList.remove("expanded");
      } else {
        const isCollapsed = sidebar.classList.toggle("collapsed");
        mainContent.classList.toggle("expanded", isCollapsed);
      }
    });
  }

  // SPA nav links
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const v = link.dataset.view || "dashboard";
      setView(v);
    });
  });

  // Search (debounced)
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    if (searchTerm) searchInput.value = searchTerm;
    let debounce;
    searchInput.addEventListener("input", (e) => {
      clearTimeout(debounce);
      const val = (e.target.value || "").trim();
      debounce = setTimeout(() => {
        searchTerm = val;
        localStorage.setItem("search_term", searchTerm);
        renderData();
      }, 120);
    });
  }

  // React to storage changes - this is for registration/directory iframe to signal data updates
  // Now we'll reload from API instead of localStorage
  window.addEventListener("storage", async (ev) => {
    if (ev.key === "emp_db") {
      try {
        await loadEmployees();
        if (localStorage.getItem("active_view") === "dashboard") renderData();
      } catch {}
    }
    if (ev.key === "att_db" || ev.key === "attrition_db") {
      try {
        if (ev.key === "att_db") await loadAttendance();
        if (ev.key === "attrition_db") await loadAttritions();
        if (localStorage.getItem("active_view") === "dashboard") renderData();
      } catch {}
    }
  });

  // Load all data from database on page load
  Promise.all([loadEmployees(), loadAttendance(), loadAttritions()])
    .then(() => {
      // Restore session after data is loaded
      const overlay = document.getElementById("loginOverlay");
      if (overlay) {
        currentUser = localStorage.getItem("current_user_role") || "wfm";
        const userEl = document.getElementById("userName");
        if (userEl) userEl.innerText = (currentUser || "").toUpperCase();
        applyRoleVisibility();
        const lastView = localStorage.getItem("active_view") || "dashboard";
        setView(canAccessView(lastView) ? lastView : "dashboard");
      } else {
        currentUser = localStorage.getItem("current_user_role") || "wfm";
        const userEl = document.getElementById("userName");
        if (userEl) userEl.innerText = (currentUser || "").toUpperCase();
        applyRoleVisibility();
        initDashboard();
        const lastView = localStorage.getItem("active_view") || "dashboard";
        setView(canAccessView(lastView) ? lastView : "dashboard");
      }
    })
    .catch((err) => {
      console.error("Failed to load initial data:", err);
      alert("⚠️ Failed to load data from server. Running with empty data.");
    });
});

/******** Date Mode Handlers (unchanged) ********/
function onDateModeChange() {
  const mode = document.getElementById("dateMode")?.value || "single";
  localStorage.setItem("date_mode", mode);
  setDateMode(mode);
}
function onSingleDateChange() {
  const single = document.getElementById("singleDate")?.value;
  if (!single) return;
  const fromEl = document.getElementById("fromDate");
  const toEl = document.getElementById("toDate");
  if (fromEl) fromEl.value = single;
  if (toEl) toEl.value = single;
  renderData();
}
function setDateMode(mode) {
  const singleInput = document.querySelector(".single-input");
  const rangeInputs = document.querySelectorAll(".range-input");
  const rangeLabels = document.querySelectorAll(".range-label");
  if (mode === "single") {
    if (singleInput) singleInput.style.display = "inline-block";
    rangeInputs.forEach((el) => (el.style.display = "none"));
    rangeLabels.forEach((el) => (el.style.display = "none"));
    const single = document.getElementById("singleDate")?.value;
    if (single) onSingleDateChange();
  } else {
    if (singleInput) singleInput.style.display = "none";
    rangeInputs.forEach((el) => (el.style.display = "inline-block"));
    rangeLabels.forEach((el) => (el.style.display = "inline-block"));
    const fromEl = document.getElementById("fromDate");
    const toEl = document.getElementById("toDate");
    const singleVal = document.getElementById("singleDate")?.value;
    const today = formatLocalISO(new Date());
    if (fromEl && !fromEl.value) fromEl.value = singleVal || today;
    if (toEl && !toEl.value) toEl.value = singleVal || today;
    renderData();
  }
}

/******** Dashboard Core (unchanged logic) ********/
function initDashboard() {
  const today = formatLocalISO(new Date());
  const fromEl = document.getElementById("fromDate");
  const toEl = document.getElementById("toDate");
  const singleEl = document.getElementById("singleDate");
  if (fromEl && !fromEl.value) fromEl.value = today;
  if (toEl && !toEl.value) toEl.value = today;
  if (singleEl && !singleEl.value) singleEl.value = today;

  const modeSelect = document.getElementById("dateMode");
  if (modeSelect) {
    const savedMode = localStorage.getItem("date_mode") || "single";
    modeSelect.value = savedMode;
    setDateMode(savedMode);
  }
  renderData();
}

function markAttendance(empId, status) {
  const to =
    document.getElementById("toDate")?.value ||
    document.getElementById("fromDate")?.value ||
    document.getElementById("singleDate")?.value;
  if (!to) return alert("Select a date");

  if (status === "Left") {
    const emp = employees.find((e) => e.id === empId);
    const name = emp ? ` ${emp.name}` : "";
    const ok = confirm(
      `Mark${name} as attrited on ${to}? This will lock further updates.`,
    );
    if (!ok) return;
    recordAttrition(empId, to);
    status = "";
  }

  // Update local object
  if (!attendance[to]) attendance[to] = {};
  if (!status) {
    delete attendance[to][empId];
    if (Object.keys(attendance[to]).length === 0) delete attendance[to];
  } else {
    attendance[to][empId] = status;
  }

  // Save to API
  saveAttendanceToAPI(empId, to, status || "").catch((err) => {
    alert(`❌ Failed to save attendance: ${err.message}`);
    // Revert local change on failure
    location.reload(); // Simple approach: refresh to get latest data
  });

  renderData();
}

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
        '<tr><td colspan="4">Select From and To dates</td></tr>';
    return;
  }

  const dates = getDateRange(from, to);
  const statusOn = (d, id) => attendance[d]?.[id] || null;

  let baseEmps = employees.slice();
  if (currentUser === "tl") {
    const myTeam = localStorage.getItem(TL_TEAM_KEY) || "Lead_Alpha";
    baseEmps = baseEmps.filter((e) => e.tl === myTeam);
  }
  baseEmps = baseEmps.filter((e) => !isAttritedOnOrBefore(e.id, to));

  let visibleEmps = baseEmps.slice();
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    visibleEmps = visibleEmps.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        (e.tl || "").toLowerCase().includes(q),
    );
  }

  const total = baseEmps.length;
  const daysCount = dates.length;

  const presentToday = baseEmps.reduce(
    (acc, e) => acc + (statusOn(to, e.id) === "Present" ? 1 : 0),
    0,
  );

  let uplDays = 0,
    slDays = 0;
  const baseEmpSummary = baseEmps.map((e) => {
    let p = 0,
      u = 0,
      s = 0;
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
  const shrinkageStr = isFinite(shrinkage) ? shrinkage.toFixed(1) : "0.0";

  const statTotalEl = document.getElementById("statTotal");
  const statPresentEl = document.getElementById("statPresent");
  const statShrinkEl = document.getElementById("statShrink");
  const statAttritionEl = document.getElementById("statAttrition");

  if (statTotalEl) statTotalEl.innerText = total;
  if (statPresentEl) {
    const pct = total ? ((presentToday / total) * 100).toFixed(0) : "0";
    statPresentEl.innerText = `${presentToday} (${pct}%)`;
  }
  if (statShrinkEl) statShrinkEl.innerText = `${shrinkageStr}%`;
  if (statAttritionEl && from && to) {
    const attrPct = computeAttrition(from, to);
    statAttritionEl.innerText = `${isFinite(attrPct) ? attrPct.toFixed(1) : "0.0"}%`;
  }

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
      const isLocked = isAttritedOnOrBefore(emp.id, to);
      const disabledAttr = isLocked ? "disabled" : "";
      const tlBadge = emp.tl === "Lead_Alpha" ? "badge-present" : "badge-upl";

      if (currentUser === "wfm") {
        return `
        <tr>
          <td><b>${emp.id}</b></td>
          <td>${emp.name}</td>
          <td><span class="badge ${tlBadge}">${emp.tl}</span></td>
          <td>
            <select onchange="markAttendance('${emp.id}', this.value)" class="input-group" title="${title}" ${disabledAttr}>
              <option value="">Select Status</option>
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
          <td><b>${emp.id}</b></td>
          <td>${emp.name}</td>
          <td><span class="badge ${tlBadge}">${emp.tl}</span></td>
          <td><span class="badge" title="${title}">${summary} (${latestStatus || "N/A"})</span></td>
        </tr>
      `;
      }
    })
    .join("");
}

function exportExcel() {
  const from = document.getElementById("fromDate")?.value;
  const to = document.getElementById("toDate")?.value || from;
  if (!from || !to) return alert("Select From and To dates to export");
  if (typeof XLSX === "undefined") {
    alert("Export library not loaded. Check internet / CDN.");
    return;
  }

  const dates = getDateRange(from, to);
  let baseEmps = employees.slice();
  if (currentUser === "tl") {
    const myTeam = localStorage.getItem(TL_TEAM_KEY) || "Lead_Alpha";
    baseEmps = baseEmps.filter((e) => e.tl === myTeam);
  }
  baseEmps = baseEmps.filter((e) => !isAttritedOnOrBefore(e.id, to));

  let exportEmps = baseEmps;
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    exportEmps = baseEmps.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        (e.tl || "").toLowerCase().includes(q),
    );
  }

  const ws_data = [["Emp ID", "Name", "Lead", "Status", "Date"]];
  exportEmps.forEach((e) => {
    dates.forEach((d) =>
      ws_data.push([e.id, e.name, e.tl, attendance[d]?.[e.id] || "N/A", d]),
    );
  });

  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  XLSX.writeFile(wb, `Attendance_${from}_to_${to}.xlsx`);
}
