const adminForm = document.querySelector("[data-admin-form]");
const adminStatus = document.querySelector("[data-admin-status]");
const leadsTable = document.querySelector("[data-leads-table]");
const csvButton = document.querySelector("[data-csv-button]");

const setAdminStatus = (message, isError = false) => {
  adminStatus.textContent = message;
  adminStatus.classList.toggle("error", isError);
};

const getToken = () => new FormData(adminForm).get("token") || sessionStorage.getItem("rawreach-admin-token") || "";

const renderLeads = (leads) => {
  if (!leads.length) {
    leadsTable.innerHTML = "<tr><td colspan=\"7\">No submissions found.</td></tr>";
    return;
  }

  leadsTable.innerHTML = "";
  leads.forEach((lead) => {
    const row = document.createElement("tr");
    const values = [
      lead.createdAt ? new Date(lead.createdAt).toLocaleString() : "",
      lead.name,
      lead.email,
      lead.company,
      lead.service,
      lead.preferredDate,
      lead.preferredTime,
      lead.message
    ];

    values.forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value || "";
      row.appendChild(cell);
    });

    leadsTable.appendChild(row);
  });
};

const fetchLeads = async () => {
  const token = getToken();
  if (!token) {
    setAdminStatus("Enter the admin token first.", true);
    return;
  }

  sessionStorage.setItem("rawreach-admin-token", token);
  setAdminStatus("Loading submissions...");

  const response = await fetch("/api/submissions?limit=500", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    throw new Error(result.message || "Could not load submissions.");
  }

  renderLeads(result.submissions || []);
  setAdminStatus(`${result.count || 0} submission${result.count === 1 ? "" : "s"} loaded.`);
};

adminForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await fetchLeads();
  } catch (error) {
    setAdminStatus(error.message || "Could not load submissions.", true);
  }
});

csvButton?.addEventListener("click", async () => {
  const token = getToken();
  if (!token) {
    setAdminStatus("Enter the admin token first.", true);
    return;
  }

  try {
    setAdminStatus("Preparing CSV...");
    const response = await fetch("/api/submissions?limit=1000&format=csv", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.message || "Could not export CSV.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rawreach-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setAdminStatus("CSV exported.");
  } catch (error) {
    setAdminStatus(error.message || "Could not export CSV.", true);
  }
});

const storedToken = sessionStorage.getItem("rawreach-admin-token");
if (storedToken && adminForm) {
  adminForm.elements.token.value = storedToken;
}
