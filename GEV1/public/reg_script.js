// ============================================================
//  reg_script.js  –  Registration form (MongoDB version)
//  All localStorage calls replaced with fetch() API calls
// ============================================================

// ---------- Small utilities ----------
function formatLocalISO(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getValue(id) {
  const el = document.getElementById(id);
  return el ? (el.value ?? "").trim() : "";
}

function getFormData() {
  return {
    empId: getValue("empId"),
    empName: getValue("empName"),
    status: getValue("status"),
    bgvStatus: getValue("bgvStatus"),
    level: getValue("level"),
    teamLead: getValue("teamLead"),
    sme: getValue("sme"),
    role: getValue("role"),
    doj: getValue("doj"),
    infyTenure: getValue("infyTenure"),
    gevDoj: getValue("gevDoj"),
    gevTenure: getValue("gevTenure"),
    lastDoj: getValue("lastDoj"),
    mobile: getValue("mobile"),
    secondaryMobile: getValue("secondaryMobile"),
    emergencyContact: getValue("emergencyContact"),
    presentAddress: getValue("presentAddress"),
    area: getValue("area"),
    routeNo: getValue("routeNo"),
    domain: getValue("domain"),
    infyId: getValue("infyId"),
    assetTag: getValue("assetTag"),
    laptopReceived: getValue("laptopReceived"),
    domainExp: getValue("domainExp"),
    infyExp: getValue("infyExp"),
    overallExp: getValue("overallExp"),
    passport: getValue("passport"),
    submittedAt: new Date().toISOString(),
  };
}

function validateForm(form) {
  if (!form.checkValidity()) {
    form.reportValidity();
    return false;
  }
  return true;
}

// ---------- Show / Hide loading state on Submit button ----------
function setLoading(isLoading) {
  const btn = document.querySelector('button[type="submit"]');
  if (!btn) return;
  btn.disabled = isLoading;
  btn.textContent = isLoading ? "Saving…" : "Submit";
}

// ---------- Export to PDF ----------
function exportPDF() {
  const form = document.getElementById("employeeForm");
  if (!validateForm(form)) return;
  window.print();
}

// ---------- Export to Excel-compatible CSV ----------
function toCSVRow(values) {
  return values
    .map((v) => {
      const s = String(v ?? "");
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    })
    .join(",");
}

function exportExcelCSV() {
  const form = document.getElementById("employeeForm");
  if (!validateForm(form)) return;

  const data = getFormData();
  const headers = Object.keys(data);
  const values = headers.map((h) => data[h]);

  const csv = [toCSVRow(headers), toCSVRow(values)].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const emp = data.empId || data.empName || "details";

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `employee-${emp}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

// ---------- Export to .xlsx ----------
function exportExcelXLSX() {
  if (typeof XLSX === "undefined") {
    alert("XLSX library not loaded. CSV export still works.");
    return;
  }
  const form = document.getElementById("employeeForm");
  if (!validateForm(form)) return;

  const data = getFormData();
  const rows = [Object.keys(data), Object.keys(data).map((k) => data[k])];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Employee");
  const emp = data.empId || data.empName || "details";
  XLSX.writeFile(wb, `employee-${emp}.xlsx`);
}

// ---------- Submit → POST to MongoDB via Express API ----------
async function submitToBackend(event) {
  event.preventDefault();

  const form = document.getElementById("employeeForm");
  if (!validateForm(form)) {
    console.warn(
      "Form validation failed - check that all required fields are filled",
    );
    return;
  }

  const payload = getFormData();

  // Basic client-side check
  if (!payload.empId || !payload.empName) {
    alert("Employee ID and Name are required.");
    return;
  }

  console.log("📤 Sending payload to /api/employees:", payload);
  setLoading(true);

  try {
    const resp = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log("📥 Response status:", resp.status);

    const result = await resp.json().catch(() => ({}));
    console.log("📥 Response body:", result);

    if (resp.status === 409) {
      // Duplicate empId
      alert(
        `Employee ID "${payload.empId}" already exists. Please use a unique ID.`,
      );
      return;
    }

    if (!resp.ok) {
      throw new Error(result.error || `Server error: ${resp.status}`);
    }

    alert(`✅ Employee "${payload.empName}" saved to database successfully!`);
    form.reset();
  } catch (err) {
    console.error("❌ Registration error:", err);
    alert(
      `❌ Failed to save employee.\n\nError: ${err.message}\n\nMake sure the server is running (node server.js).`,
    );
  } finally {
    setLoading(false);
  }
}

// ---------- Wire up ----------
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnPdf")?.addEventListener("click", exportPDF);
  document
    .getElementById("btnExcel")
    ?.addEventListener("click", exportExcelCSV);
  document
    .getElementById("btnXlsx")
    ?.addEventListener("click", exportExcelXLSX);
  document
    .getElementById("employeeForm")
    ?.addEventListener("submit", submitToBackend);
});
