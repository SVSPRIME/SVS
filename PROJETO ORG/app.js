const SUPABASE_URL = "https://naplowsidulxqhjjhxus.supabase.co";
const SUPABASE_KEY = "sb_publishable_R3nDvvrP-oGAc4OtH9iXLQ_rUQN8Sub";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const form = document.querySelector("#inspection-form");
const performedBy = document.querySelector("#performed-by");
const performedDate = document.querySelector("#performed-date");
const deadline = document.querySelector("#deadline");
const returnDate = document.querySelector("#return-date");
const calculationHint = document.querySelector("#calculation-hint");
const list = document.querySelector("#inspection-list");
const filter = document.querySelector("#status-filter");
const amountField = document.querySelector("#amount-field");
const amount = document.querySelector("#amount");
const imageInput = document.querySelector("#image");
const imagePreview = document.querySelector("#image-preview");
const navItems = document.querySelectorAll(".nav-item");

const pageConfig = {
  inspections: { eyebrow: "VIGILÂNCIA SANITÁRIA", title: "Controle de<br><em>inspeções.</em>", description: "Registre atividades, acompanhe os prazos e mantenha a rotina da equipe organizada em um só lugar.", formEyebrow: "REGISTRO", formTitle: "Nova inspeção", listTitle: "Próximos retornos", descriptionLabel: "O que foi feito?", placeholder: "Descreva a inspeção realizada..." },
  notifications: { eyebrow: "VIGILÂNCIA SANITÁRIA", title: "Central de<br><em>notificações.</em>", description: "Organize comunicados, alertas e acompanhamentos que precisam chegar à equipe.", formEyebrow: "COMUNICAÇÃO", formTitle: "Nova notificação", listTitle: "Notificações registradas", descriptionLabel: "Conteúdo da notificação", placeholder: "Descreva a notificação..." },
  infractions: { eyebrow: "VIGILÂNCIA SANITÁRIA", title: "Autos de<br><em>infração.</em>", description: "Registre autos emitidos, seus prazos e os valores relacionados a cada ocorrência.", formEyebrow: "DOCUMENTO", formTitle: "Novo auto de infração", listTitle: "Autos registrados", descriptionLabel: "Descrição da infração", placeholder: "Descreva a infração..." }
};

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

let inspections = [];
let activePage = "inspections";
const today = new Date();
today.setHours(0, 0, 0, 0);
performedDate.value = toInputDate(today);

function fromDatabase(item) {
  return {
    id: item.id,
    performedDate: item.performed_date,
    deadline: item.deadline,
    returnDate: item.return_date,
    description: item.description,
    performedBy: item.performed_by,
    createdAt: item.created_at,
    completed: item.completed,
    updatedBy: item.updated_by,
    updatedAt: item.updated_at,
    recordType: item.record_type || "inspections",
    amount: item.amount,
    imageData: parseImages(item.image_data)
  };
}

function parseImages(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [value];
  } catch {
    return [value];
  }
}

async function loadInspections() {
  const { data, error } = await supabaseClient.from("inspections").select("*").order("return_date", { ascending: true });
  if (error) throw error;
  inspections = data.map(fromDatabase);
  render();
}

async function createInspection(item) {
  const { error } = await supabaseClient.from("inspections").insert({
    id: item.id,
    performed_date: item.performedDate,
    deadline: item.deadline,
    return_date: item.returnDate,
    description: item.description,
    performed_by: item.performedBy,
    created_at: item.createdAt,
    completed: false,
    record_type: item.recordType,
    amount: item.amount || null,
    image_data: item.imageData.length ? JSON.stringify(item.imageData) : null
  });
  if (error) throw error;
}

async function updateInspection(item) {
  const { error } = await supabaseClient.from("inspections").update({
    completed: item.completed,
    updated_by: item.updatedBy,
    updated_at: item.updatedAt
  }).eq("id", item.id);
  if (error) throw error;
}

async function deleteInspection(id) {
  const { error } = await supabaseClient.from("inspections").delete().eq("id", id);
  if (error) throw error;
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

function formatDateTime(value) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
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
    .filter(item => item.recordType === activePage)
    .filter(item => selected === "all" || (selected === "done" ? item.completed : !item.completed))
    .sort((a, b) => parseDate(a.returnDate) - parseDate(b.returnDate));

  const pageItems = inspections.filter(item => item.recordType === activePage);

  document.querySelector("#record-count").textContent = pageItems.length;
  document.querySelector("#pending-count").textContent = pageItems.filter(item => !item.completed).length;
  document.querySelector("#today-count").textContent = pageItems.filter(item => getStatus(item) === "today").length;
  document.querySelector("#done-count").textContent = pageItems.filter(item => item.completed).length;

  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state"><strong>${pageItems.length ? "Nada por aqui" : "Nenhum registro ainda"}</strong><p>${pageItems.length ? "Não há registros neste filtro." : "Cadastre um registro para acompanhar esta área."}</p></div>`;
    return;
  }

  list.innerHTML = filtered.map((item, index) => {
    const status = getStatus(item);
    const performedText = formatDate(item.performedDate, { day: "2-digit", month: "2-digit", year: "numeric" });
    const activityText = item.updatedBy
      ? `${escapeHtml(item.updatedBy)} ${item.completed ? "concluiu" : "reabriu"} em ${formatDateTime(item.updatedAt)}`
      : `Registrado por ${escapeHtml(item.performedBy || "Usuário não identificado")} em ${formatDateTime(item.createdAt || `${item.performedDate}T12:00:00`)}`;
    const amountText = activePage === "infractions" && item.amount !== null && item.amount !== undefined
      ? `<span class="record-amount">R$ ${Number(item.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span><span class="dot"></span>`
      : "";
    const imageText = item.imageData.length
      ? `<div class="record-images">${item.imageData.map((image, imageIndex) => `<img class="record-image" src="${image}" alt="Imagem ${imageIndex + 1} anexada ao registro">`).join("")}</div>`
      : "";
    return `<article class="inspection-card" style="animation-delay: ${index * 45}ms">
      <div class="date-block"><strong>${formatDate(item.returnDate, { day: "2-digit" })}</strong><span>${formatDate(item.returnDate, { month: "short" }).replace(".", "")}</span></div>
      <div class="card-content"><h3>${escapeHtml(item.description)}</h3><div class="card-meta"><span>${activityText}</span><span class="dot"></span>${amountText}<span>Feita em ${performedText}</span><span class="dot"></span><span>${item.deadline} ${item.deadline == 1 ? "dia" : "dias"} de prazo</span></div>${imageText}</div>
      <div class="card-action"><span class="status ${status}">${statusLabel(status)}</span><button class="icon-button" type="button" data-id="${item.id}" aria-label="${item.completed ? "Reabrir" : "Marcar como concluído"}">${item.completed ? "↶" : "✓"}</button><button class="icon-button" type="button" data-delete="${item.id}" aria-label="Excluir registro">×</button></div>
    </article>`;
  }).join("");
}

function escapeHtml(text) {
  return text.replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[character]));
}

[performedDate, deadline].forEach(input => input.addEventListener("input", updateReturnDate));
filter.addEventListener("change", render);
imageInput.addEventListener("change", () => {
  const files = Array.from(imageInput.files).slice(0, 10);
  if (imageInput.files.length > 10) {
    calculationHint.textContent = "Selecione no máximo 10 imagens.";
    imageInput.value = "";
    imagePreview.hidden = true;
    imagePreview.innerHTML = "";
    return;
  }
  if (!files.length) {
    imagePreview.hidden = true;
    imagePreview.innerHTML = "";
    return;
  }
  imagePreview.hidden = false;
  imagePreview.innerHTML = files.map(file => `<span class="image-preview-item">${escapeHtml(file.name)}</span>`).join("");
});

function readImages(files) {
  return Promise.all(Array.from(files).slice(0, 10).map(file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  })));
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const data = new FormData(form);
  const now = new Date().toISOString();
  const item = { id: crypto.randomUUID(), performedDate: data.get("performedDate"), deadline: Number(data.get("deadline")), returnDate: data.get("returnDate"), description: data.get("description").trim(), performedBy: data.get("performedBy"), createdAt: now, completed: false, recordType: activePage, amount: activePage === "infractions" ? Number(data.get("amount") || 0) : null, imageData: await readImages(imageInput.files) };
  createInspection(item).then(() => {
    inspections.push(item);
    form.reset();
    imagePreview.hidden = true;
    imagePreview.innerHTML = "";
    performedDate.value = toInputDate(today);
    calculationHint.textContent = "Preencha a data e o prazo para calcular automaticamente.";
    render();
  }).catch(showDatabaseError);
});

function updatePage(page) {
  activePage = page;
  const config = pageConfig[page];
  document.querySelector("#page-eyebrow").textContent = config.eyebrow;
  document.querySelector("#page-title").innerHTML = config.title;
  document.querySelector("#page-description").textContent = config.description;
  document.querySelector("#form-eyebrow").textContent = config.formEyebrow;
  document.querySelector("#form-title").textContent = config.formTitle;
  document.querySelector("#list-title").innerHTML = `${config.listTitle} <span id="record-count">0</span>`;
  document.querySelector("#description-label").textContent = config.descriptionLabel;
  document.querySelector("#description").placeholder = config.placeholder;
  amountField.hidden = page !== "infractions";
  navItems.forEach(item => item.classList.toggle("active", item.dataset.page === page));
  filter.value = "all";
  render();
}

navItems.forEach(item => item.addEventListener("click", () => updatePage(item.dataset.page)));

list.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;
  const id = button.dataset.id || button.dataset.delete;
  const inspection = inspections.find(item => item.id === id);
  if (!inspection) return;
  if (button.dataset.delete) {
    deleteInspection(id).then(() => {
      inspections = inspections.filter(item => item.id !== id);
      render();
    }).catch(showDatabaseError);
    return;
  } else {
    inspection.completed = !inspection.completed;
    inspection.updatedBy = performedBy.value;
    inspection.updatedAt = new Date().toISOString();
  }
  updateInspection(inspection).then(render).catch(showDatabaseError);
});

function showDatabaseError(error) {
  console.error(error);
  calculationHint.textContent = "Não foi possível sincronizar. Execute o SQL do Supabase e tente novamente.";
}

supabaseClient.channel("inspections-sync")
  .on("postgres_changes", { event: "*", schema: "public", table: "inspections" }, loadInspections)
  .subscribe();

loadInspections().catch(showDatabaseError);
