// State
let Trips = [];
let curTrip = null; // index into Trips
let People = [];
let Expenses = [];
let curr = "INR";
const symb = { INR: "₹", USD: "$", EUR: "€" };

// --- Persistence (localStorage) ---
function saveAll() {
  const payload = { trips: Trips, currency: curr };
  localStorage.setItem("tripSplitter_v1", JSON.stringify(payload));
}

function loadAll() {
  try {
    const raw = localStorage.getItem("tripSplitter_v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      Trips = parsed.trips || [];
      curr = parsed.currency || "INR";
    } else {
      Trips = [];
    }
  } catch (e) {
    console.warn("Failed to load saved data", e);
    Trips = [];
  }
}

// --- Navigation & UI ---
function showPage(pg) {
  document.querySelectorAll(".page").forEach(x => x.classList.add("hide"));
  document.getElementById(pg).classList.remove("hide");
}

function openSidebar() {
  document.getElementById("sidebar").classList.add("open");
  if (window.anime) {
    anime({
      targets: ".sidebar ul li",
      translateX: [-40, 0],
      opacity: [0, 1],
      duration: 350,
      delay: anime.stagger(80),
      easing: "easeOutQuad"
    });
  }
}

function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
}

function showTrips() {
  showPage("trips");
  closeSidebar();
  renderTrips();
  animatePageEnter();
}

function showCalculator() {
  showPage("calculator");
  closeSidebar();
  renderCalculator();
}

function showAbout() {
  showPage("about");
  closeSidebar();
}

function showLoader() {
  const l = document.getElementById("loader");
  l.style.display = "flex";
  if (window.anime) {
    anime({
      targets: ".loader-circle",
      scale: [1, 1.4, 1],
      duration: 800,
      delay: anime.stagger(160),
      loop: true,
      easing: "easeInOutQuad"
    });
  }
}

function hideLoader() {
  document.getElementById("loader").style.display = "none";
}

function animatePageEnter() {
  if (!window.anime) return;
  anime({
    targets: ".card",
    opacity: [0, 1],
    translateY: [24, 0],
    duration: 500,
    delay: anime.stagger(80),
    easing: "easeOutQuad"
  });
}

// --- Theme (dark mode) ---
function toggleDarkMode() {
  const body = document.body;
  body.classList.toggle("dark");
  const pressed = body.classList.contains("dark");
  document.getElementById("theme-toggle").setAttribute("aria-pressed", pressed);
  localStorage.setItem("tripSplitter_theme", pressed ? "dark" : "light");
}

function loadTheme() {
  const saved = localStorage.getItem("tripSplitter_theme");
  if (saved === "dark") document.body.classList.add("dark");
  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) themeBtn.setAttribute("aria-pressed", document.body.classList.contains("dark"));
}

// --- Auth (simple demo) ---
function login() {
  const u = document.getElementById("user").value.trim();
  const p = document.getElementById("pass").value.trim();
  const msg = document.getElementById("msg");

  showLoader();
  setTimeout(() => {
    if (u === "user" && p === "pass") {
      hideLoader();
      msg.textContent = "";
      showTrips();
    } else {
      hideLoader();
      msg.textContent = "Wrong login — try 'user' / 'pass' or continue as guest";
      if (window.anime) {
        anime({
          targets: "#msg",
          translateX: [18, -18, 0],
          duration: 400,
          easing: "easeInOutQuad"
        });
      }
    }
  }, 900);
}

function quickGuest() {
  showTrips();
}

// --- Trips ---
function showForm() {
  document.getElementById("form").classList.remove("hide");
  document.getElementById("tripname").focus();
}

function hideForm() {
  document.getElementById("form").classList.add("hide");
  document.getElementById("tripname").value = "";
}

function addTrip() {
  const nm = document.getElementById("tripname").value.trim();
  if (!nm) {
    alert("Enter trip name");
    return;
  }
  if (Trips.find(t => t.name.toLowerCase() === nm.toLowerCase())) {
    alert("Trip exists");
    return;
  }
  Trips.push({ id: Date.now(), name: nm, people: [], expenses: [] });
  saveAll();
  hideForm();
  renderTrips();
}

function selectTrip(idx) {
  curTrip = idx;
  People = [...Trips[idx].people];
  Expenses = [...Trips[idx].expenses];
  document.getElementById("trip-title").textContent = Trips[idx].name;
  document.getElementById("trip-detail").classList.remove("hide");
  renderPeople();
  renderExpenses();
  calc();
  if (window.anime) {
    anime({
      targets: "#trip-detail",
      opacity: [0, 1],
      translateY: [16, 0],
      duration: 420,
      easing: "easeOutQuad"
    });
  }
}

function deleteTrip(idx) {
  if (!confirm("Delete this trip?")) return;
  Trips.splice(idx, 1);
  if (curTrip === idx) {
    curTrip = null;
    People = [];
    Expenses = [];
    document.getElementById("trip-detail").classList.add("hide");
  }
  saveAll();
  renderTrips();
}

function resetTrip() {
  if (curTrip === null) return;
  if (!confirm("Reset this trip (remove all people & expenses)?")) return;
  Trips[curTrip].people = [];
  Trips[curTrip].expenses = [];
  People = [];
  Expenses = [];
  saveAll();
  renderPeople();
  renderExpenses();
  calc();
}

function renderTrips() {
  const list = document.getElementById("triplist");
  const empty = document.getElementById("trips-empty");
  list.innerHTML = "";
  if (Trips.length === 0) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  Trips.forEach((t, i) => {
    const li = document.createElement("li");
    li.className = "item list-item";
    const left = document.createElement("div");
    left.innerHTML = `<strong>${t.name}</strong><div class="meta">${t.people.length} people · ${t.expenses.length} expenses</div>`;
    const right = document.createElement("div"
    );
    const openBtn = document.createElement("button");
    openBtn.textContent = "Open";
    openBtn.onclick = () => selectTrip(i);
    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.style.background = "#ff6b6b";
    delBtn.onclick = () => deleteTrip(i);
    right.appendChild(openBtn);
    right.appendChild(delBtn);
    li.appendChild(left);
    li.appendChild(right);
    list.appendChild(li);
  });
}

// --- People ---
function addPerson() {
  const inp = document.getElementById("person-input");
  const name = inp.value.trim();
  if (!name) return;
  if (People.find(p => p.toLowerCase() === name.toLowerCase())) {
    alert("Person already added");
    return;
  }
  People.push(name);
  syncTrip();
  inp.value = "";
  renderPeople();
  calc();
}

function removePerson(idx) {
  People.splice(idx, 1);
  // remove any expenses by that person
  Expenses = Expenses.filter(e => e.payer !== idx); // old ids are indices; we will reassign IDs whenever we sync - to be safe we will rebuild payer references
  // rebuild payer references: if expense.payerName matches removed person, remove that expense
  Expenses = Expenses.filter(e => e.payerName && People.includes(e.payerName));
  syncTrip();
  renderPeople();
  renderExpenses();
  calc();
}

function renderPeople() {
  const ul = document.getElementById("people-list");
  const empty = document.getElementById("people-empty");
  ul.innerHTML = "";
  if (People.length === 0) {
    empty.style.display = "block";
    updatePayerOptions();
    return;
  }
  empty.style.display = "none";
  People.forEach((p, i) => {
    const li = document.createElement("li");
    li.className = "item list-item";
    li.innerHTML = `<span>${p}</span>`;
    const btn = document.createElement("button");
    btn.textContent = "Remove";
    btn.onclick = () => removePerson(i);
    li.appendChild(btn);
    ul.appendChild(li);
  });
  updatePayerOptions();
}

// Update payer select options
function updatePayerOptions() {
  const sel = document.getElementById("expense-payer");
  sel.innerHTML = `<option value="">Payer</option>`;
  People.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    sel.appendChild(opt);
  });
}

// --- Expenses ---
function addExpense() {
  const desc = document.getElementById("expense-desc").value.trim();
  const amt = parseFloat(document.getElementById("expense-amount").value);
  const payer = document.getElementById("expense-payer").value;
  if (!desc || isNaN(amt) || amt <= 0) {
    alert("Enter valid description and amount");
    return;
  }
  if (!payer) {
    alert("Select payer");
    return;
  }
  Expenses.push({ id: Date.now(), desc, amount: amt, payerName: payer });
  document.getElementById("expense-desc").value = "";
  document.getElementById("expense-amount").value = "";
  document.getElementById("expense-payer").value = "";
  syncTrip();
  renderExpenses();
  calc();
}

function splitEquallyForLast() {
  // convenience: if last expense exists, mark it as split equally (we already split equally by default)
  if (!Expenses.length) {
    alert("No expense to split");
    return;
  }
  calc();
  alert("Expenses are split equally by default (per-person share).");
}

function removeExpense(id) {
  Expenses = Expenses.filter(e => e.id !== id);
  syncTrip();
  renderExpenses();
  calc();
}

function renderExpenses(highlightOutliers = []) {
  const ul = document.getElementById("expense-list");
  const empty = document.getElementById("expense-empty");
  ul.innerHTML = "";
  if (Expenses.length === 0) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  Expenses.forEach(e => {
    const li = document.createElement("li");
    li.className = "item list-item";
    if (highlightOutliers.includes(e.id)) li.classList.add("expense-outlier");
    const left = document.createElement("div");
    left.innerHTML = `<strong>${e.desc}</strong><div class="meta">${e.payerName ? e.payerName + " paid · " : ""}${symb[curr]}${e.amount.toFixed(2)}</div>`;
    const btn = document.createElement("button");
    btn.textContent = "Remove";
    btn.onclick = () => removeExpense(e.id);
    li.appendChild(left);
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

// --- Currency ---
function changeCurrency() {
  const s1 = document.getElementById("currency");
  const s2 = document.getElementById("calcCurrency");
  if (s1) curr = s1.value;
  if (s2) curr = s2.value;
  if (s1 && s2) {
    s1.value = curr;
    s2.value = curr;
  }
  saveAll();
  renderExpenses();
  calc();
  renderCalculator();
}

// --- Calculation & Summary ---
// Calculates totals and per-person shares; also returns per-person paid and net balances
function computeBalances() {
  const summary = { total: 0, perPerson: 0, paid: {}, net: {} };

  if (People.length === 0) return summary;
  if (Expenses.length === 0) return summary;

  const total = Expenses.reduce((s, x) => s + x.amount, 0);
  const perPerson = total / People.length;
  summary.total = total;
  summary.perPerson = perPerson;

  // init paid totals
  People.forEach(p => summary.paid[p] = 0);
  Expenses.forEach(e => {
    if (e.payerName && summary.paid.hasOwnProperty(e.payerName)) summary.paid[e.payerName] += e.amount;
  });

  // net = paid - perPerson
  People.forEach(p => summary.net[p] = +(summary.paid[p] - perPerson));

  return summary;
}

// Render summary in page
function renderSummary() {
  const summaryEl = document.getElementById("summary");
  if (!summaryEl) return;
  if (People.length === 0) {
    summaryEl.innerHTML = `<p class="empty">Add people first</p>`;
    return;
  }
  if (Expenses.length === 0) {
    summaryEl.innerHTML = `<p class="empty">Add expenses first</p>`;
    return;
  }
  const s = computeBalances();
  let rows = Object.keys(s.net).map(p => {
    const net = s.net[p];
    const note = net > 0 ? `should receive ${symb[curr]}${net.toFixed(2)}` : net < 0 ? `owes ${symb[curr]}${Math.abs(net).toFixed(2)}` : `settled`;
    return `<li class="item">${p} — ${note}</li>`;
  });

  const html = `
    <p><strong>Total:</strong> ${symb[curr]}${s.total.toFixed(2)}</p>
    <p><strong>Per person:</strong> ${symb[curr]}${s.perPerson.toFixed(2)}</p>
    <ul>${rows.join("")}</ul>
  `;
  summaryEl.innerHTML = html;

  // update calculator quick view
  const calcDisp = document.getElementById("calc-display");
  if (calcDisp) {
    calcDisp.textContent = `Total: ${symb[curr]}${s.total.toFixed(2)} · Per person: ${symb[curr]}${s.perPerson.toFixed(2)}`;
  }
}

function calc() {
  renderSummary();
  saveAll();
  // animate result
  if (window.anime) {
    anime({
      targets: "#result",
      opacity: [0, 1],
      scale: [0.96, 1],
      duration: 420,
      easing: "easeOutQuad"
    });
  }
}

function renderCalculator() {
  const calcDisp = document.getElementById("calc-display");
  if (!calcDisp) return;
  const total = Expenses.reduce((s, x) => s + x.amount, 0);
  const share = People.length ? total / People.length : 0;
  calcDisp.textContent =
    People.length && Expenses.length
      ? `Total: ${symb[curr]}${total.toFixed(2)} · Per person: ${symb[curr]}${share.toFixed(2)}`
      : "Add people and expenses in a trip.";
}

// --- Settlement algorithm (greedy minimal payments) ---
function computeSuggestedPayments() {
  // returns array of {from, to, amount}
  const s = computeBalances();
  if (!s || !s.net) return [];

  const creditors = []; // {name, amount} positive net => should receive
  const debtors = []; // negative net => owe

  Object.keys(s.net).forEach(name => {
    const amt = +(s.net[name].toFixed(2));
    if (amt > 0.005) creditors.push({ name, amt });
    else if (amt < -0.005) debtors.push({ name, amt: -amt }); // store as positive owed amount
  });

  // sort largest first
  creditors.sort((a, b) => b.amt - a.amt);
  debtors.sort((a, b) => b.amt - a.amt);

  const payments = [];

  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const pay = Math.min(debtor.amt, creditor.amt);
    payments.push({ from: debtor.name, to: creditor.name, amount: +pay.toFixed(2) });
    debtor.amt = +(debtor.amt - pay).toFixed(2);
    creditor.amt = +(creditor.amt - pay).toFixed(2);
    if (Math.abs(debtor.amt) < 0.005) i++;
    if (Math.abs(creditor.amt) < 0.005) j++;
  }

  return payments;
}

function showSuggestedPayments() {
  const out = document.getElementById("assistant-output");
  if (!out) return;
  if (People.length === 0 || Expenses.length === 0) {
    out.textContent = "Add people and expenses first.";
    return;
  }
  const payments = computeSuggestedPayments();
  if (!payments.length) {
    out.textContent = "All settled — no payments needed.";
    return;
  }
  const lines = payments.map(p => `${p.from} → ${p.to}: ${symb[curr]}${p.amount.toFixed(2)}`);
  out.textContent = "Suggested payments to settle debts:\n" + lines.join("\n");
}

// --- Assistant helpers (rule-based) ---
function assistantExplainSplit() {
  const out = document.getElementById("assistant-output");
  if (!out) return;
  if (People.length === 0 || Expenses.length === 0) {
    out.textContent = "There is nothing to explain — add people and expenses.";
    return;
  }
  const s = computeBalances();
  let lines = [];
  lines.push(`Total ${symb[curr]}${s.total.toFixed(2)}, per person ${symb[curr]}${s.perPerson.toFixed(2)}.`);
  lines.push("Paid per person:");
  Object.keys(s.paid).forEach(p => lines.push(`- ${p}: ${symb[curr]}${s.paid[p].toFixed(2)}`));
  lines.push("Net (positive = should receive):");
  Object.keys(s.net).forEach(p => lines.push(`- ${p}: ${symb[curr]}${s.net[p].toFixed(2)}`));
  out.textContent = lines.join("\n");
}

function findOutliers() {
  const out = document.getElementById("assistant-output");
  if (!out) return;
  if (Expenses.length === 0) {
    out.textContent = "No expenses to analyze.";
    return;
  }
  // detect outliers using simple mean + 2*std rule
  const amts = Expenses.map(e => e.amount);
  const mean = amts.reduce((s, v) => s + v, 0) / amts.length;
  const variance = amts.reduce((s, v) => s + (v - mean) * (v - mean), 0) / amts.length;
  const std = Math.sqrt(variance);
  const threshold = mean + 2 * std;
  const outliers = Expenses.filter(e => e.amount > threshold);
  if (!outliers.length) {
    out.textContent = `No outliers detected (mean ${symb[curr]}${mean.toFixed(2)}, std ${symb[curr]}${std.toFixed(2)}).`;
    renderExpenses([]);
    return;
  }
  const lines = [`Found ${outliers.length} potential outlier(s) — threshold ${symb[curr]}${threshold.toFixed(2)}:`];
  outliers.forEach(o => lines.push(`- ${o.desc} paid by ${o.payerName}: ${symb[curr]}${o.amount.toFixed(2)}`));
  out.textContent = lines.join("\n");
  renderExpenses(outliers.map(o => o.id));
}

function optimizePayments() {
  // small optimization: try to minimize total transfers by combining where possible (our greedy already does this)
  const out = document.getElementById("assistant-output");
  if (!out) return;
  const payments = computeSuggestedPayments();
  if (!payments.length) {
    out.textContent = "No optimization needed — already settled.";
    return;
  }
  out.textContent = "Optimized payment plan (greedy pair matching):\n" + payments.map(p => `${p.from} → ${p.to}: ${symb[curr]}${p.amount.toFixed(2)}`).join("\n");
}

// Simple assistant free-text handler (very basic)
function assistantHandleInput() {
  const q = document.getElementById("assistant-input").value.trim().toLowerCase();
  const out = document.getElementById("assistant-output");
  if (!q) return;
  if (q.includes("who") && q.includes("ow")) {
    showSuggestedPayments();
  } else if (q.includes("outlier") || q.includes("large")) {
    findOutliers();
  } else if (q.includes("explain") || q.includes("how") || q.includes("split")) {
    assistantExplainSplit();
  } else {
    out.textContent = "I can: explain split, show suggested payments, find outliers, or optimize payments. Try: 'who owes whom', 'find outliers', 'explain split'.";
  }
  document.getElementById("assistant-input").value = "";
}

// --- Persistence helper (sync active trip state back into Trips) ---
function syncTrip() {
  if (curTrip === null || curTrip < 0 || curTrip >= Trips.length) return;
  // store current People and Expenses back
  Trips[curTrip].people = [...People];
  Trips[curTrip].expenses = [...Expenses];
  saveAll();
}

// --- Export ---
function downloadPdf() {
  if (curTrip === null) {
    alert("No trip selected");
    return;
  }
  const t = Trips[curTrip];
  const total = Expenses.reduce((s, e) => s + e.amount, 0);
  const share = People.length > 0 ? total / People.length : 0;

  try {
    const JSPDF = window.jspdf?.jsPDF || window.jsPDF;
    if (!JSPDF) throw new Error("jsPDF not available");

    const doc = new JSPDF();
    doc.setFontSize(18);
    doc.text("Trip Expense Report", 20, 22);
    doc.setFontSize(14);
    doc.text("Trip: " + t.name, 20, 36);

    let y = 48;
    doc.setFontSize(12);
    if (People.length > 0) {
      doc.text("People:", 20, y); y += 8;
      People.forEach(p => { doc.text("- " + p, 26, y); y += 7; });
      y += 4;
    }

    if (Expenses.length > 0) {
      doc.text("Expenses:", 20, y); y += 8;
      Expenses.forEach(e => {
        doc.text(`- ${e.desc} (${e.payerName}): ${symb[curr]}${e.amount.toFixed(2)}`, 26, y);
        y += 7;
        if (y > 270) { doc.addPage(); y = 20; }
      });
      y += 4;
    }

    const s = computeBalances();
    doc.text(`Total: ${symb[curr]}${s.total.toFixed(2)}`, 20, y); y += 7;
    doc.text(`Per person: ${symb[curr]}${s.perPerson.toFixed(2)}`, 20, y); y += 10;

    const payments = computeSuggestedPayments();
    if (payments.length) {
      doc.text("Suggested payments to settle:", 20, y); y += 8;
      payments.forEach(p => { doc.text(`- ${p.from} → ${p.to}: ${symb[curr]}${p.amount.toFixed(2)}`, 26, y); y += 7; });
    } else {
      doc.text("All settled — no payments needed.", 20, y); y += 7;
    }

    doc.save(`${t.name}_split.pdf`);
  } catch (err) {
    // Fallback TXT
    const lines = [
      `Trip: ${t.name}`,
      "",
      "People:",
      People.join(", "),
      "",
      "Expenses:",
      ...Expenses.map(e => `${e.desc} (${e.payerName}): ${symb[curr]}${e.amount.toFixed(2)}`),
      "",
      `Total: ${symb[curr]}${total.toFixed(2)}`,
      `Per person: ${symb[curr]}${share.toFixed(2)}`,
      "",
      "Suggested payments:",
      ...computeSuggestedPayments().map(p => `${p.from} -> ${p.to}: ${symb[curr]}${p.amount.toFixed(2)}`)
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t.name}_split.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

function exportJson() {
  const blob = new Blob([JSON.stringify(Trips, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `trips_export.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function copyShareable() {
  if (curTrip === null) return;
  const t = Trips[curTrip];
  const s = computeBalances();
  let text = `Trip: ${t.name}\nTotal: ${symb[curr]}${s.total.toFixed(2)}\nPer person: ${symb[curr]}${s.perPerson.toFixed(2)}\n\nPeople:\n${People.join(", ")}\n\nExpenses:\n${Expenses.map(e => `${e.desc} (${e.payerName}): ${symb[curr]}${e.amount.toFixed(2)}`).join("\n")}\n\nSuggested payments:\n${computeSuggestedPayments().map(p => `${p.from} -> ${p.to}: ${symb[curr]}${p.amount.toFixed(2)}`).join("\n")}`;
  navigator.clipboard?.writeText(text).then(() => alert("Copied to clipboard"), () => alert("Copy failed"));
}

// --- Boot ---
document.addEventListener("DOMContentLoaded", () => {
  // Load persisted data
  loadAll();
  loadTheme();

  // Start at login
  showPage("login");

  // Keep the two currency selects in sync
  const s1 = document.getElementById("currency");
  const s2 = document.getElementById("calcCurrency");
  if (s1 && s2) {
    s2.value = s1.value = curr;
  }

  // Render any pre-existing trips
  renderTrips();
});
