const STORAGE_KEY = "retorna-inspections";
const form = document.querySelector("#inspection-form");
const performedDate = document.querySelector("#performed-date");
const deadline = document.querySelector("#deadline");
const returnDate = document.querySelector("#return-date");
const calculationHint = document.querySelector("#calculation-hint");
const list = document.querySelector("#inspection-list");
const filter = document.querySelector("#status-filter");

if ("serviceWorker" in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("sw.js", { updateViaCache: "none" });
      await registration.update();
    } catch {
    }
  });
}

let inspections = readInspections();
const today = new Date();
today.setHours(0, 0, 0, 0);
performedDate.value = toInputDate(today);

function readInspections() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveInspections() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(inspections));
}

function toInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value, options) {
  return parseDate(value).toLocaleDateString("pt-BR", options);
}

function updateReturnDate() {
  if (!performedDate.value || deadline.value === "") return;
  const date = parseDate(performedDate.value);
  date.setDate(date.getDate() + Number(deadline.value));
  returnDate.value = toInputDate(date);
  calculationHint.textContent = `Retorno calculado para ${formatDate(returnDate.value, { day: "2-digit", month: "long" })}. Você pode ajustar a data se necessário.`;
}

function getStatus(item) {
  if (item.completed) return "done";
  const date = parseDate(item.returnDate);
  if (date < today) return "overdue";
  if (date.getTime() === today.getTime()) return "today";
  return "open";
}

function statusLabel(status) {
  return { overdue: "Atrasado", today: "Hoje", open: "Pendente", done: "Concluído" }[status];
}

function render() {
  const selected = filter.value;
  const filtered = inspections
    .filter(item => selected === "all" || (selected === "done" ? item.completed : !item.completed))
    .sort((a, b) => parseDate(a.returnDate) - parseDate(b.returnDate));

  document.querySelector("#record-count").textContent = inspections.length;
  document.querySelector("#pending-count").textContent = inspections.filter(item => !item.completed).length;
  document.querySelector("#today-count").textContent = inspections.filter(item => getStatus(item) === "today").length;
  document.querySelector("#done-count").textContent = inspections.filter(item => item.completed).length;

  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state"><strong>${inspections.length ? "Nada por aqui" : "Sua agenda começa aqui"}</strong><p>${inspections.length ? "Não há registros neste filtro." : "Cadastre uma inspeção ao lado para acompanhar seus retornos."}</p></div>`;
    return;
  }

  list.innerHTML = filtered.map((item, index) => {
    const status = getStatus(item);
    const returnText = formatDate(item.returnDate, { day: "2-digit", month: "short" }).replace(" de ", "/").replace(".", "");
    const performedText = formatDate(item.performedDate, { day: "2-digit", month: "2-digit", year: "numeric" });
    return `<article class="inspection-card" style="animation-delay: ${index * 45}ms">
      <div class="date-block"><strong>${formatDate(item.returnDate, { day: "2-digit" })}</strong><span>${formatDate(item.returnDate, { month: "short" }).replace(".", "")}</span></div>
      <div class="card-content"><h3>${escapeHtml(item.description)}</h3><div class="card-meta"><span>Feita em ${performedText}</span><span class="dot"></span><span>${item.deadline} ${item.deadline == 1 ? "dia" : "dias"} de prazo</span></div></div>
      <div class="card-action"><span class="status ${status}">${statusLabel(status)}</span><button class="icon-button" type="button" data-id="${item.id}" aria-label="${item.completed ? "Reabrir" : "Marcar como concluído"}">${item.completed ? "↶" : "✓"}</button><button class="icon-button" type="button" data-delete="${item.id}" aria-label="Excluir registro">×</button></div>
    </article>`;
  }).join("");
}

function escapeHtml(text) {
  return text.replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[character]));
}

[performedDate, deadline].forEach(input => input.addEventListener("input", updateReturnDate));
filter.addEventListener("change", render);
form.addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(form);
  inspections.push({ id: crypto.randomUUID(), performedDate: data.get("performedDate"), deadline: Number(data.get("deadline")), returnDate: data.get("returnDate"), description: data.get("description").trim(), completed: false });
  saveInspections();
  form.reset();
  performedDate.value = toInputDate(today);
  calculationHint.textContent = "Preencha a data e o prazo para calcular automaticamente.";
  render();
});

list.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;
  const id = button.dataset.id || button.dataset.delete;
  const inspection = inspections.find(item => item.id === id);
  if (!inspection) return;
  if (button.dataset.delete) inspections = inspections.filter(item => item.id !== id);
  else inspection.completed = !inspection.completed;
  saveInspections();
  render();
});

render();
