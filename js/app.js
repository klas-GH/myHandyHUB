const STORAGE_KEY = "myHandyHub.todos";
const THEME_KEY = "myHandyHub.theme";
let todos = loadTodos();
let currentStatusFilter = "all";

const themeSelector = document.querySelector("#theme-selector");
const themeColors = { light: "#f5f1e8", dark: "#141816" };

function applyTheme(theme) {
  const root = document.documentElement;
  const effectiveTheme = theme === "dark" ? "dark" : "light";
  root.setAttribute("data-theme", effectiveTheme);
  root.style.colorScheme = effectiveTheme;
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute("content", effectiveTheme === "dark" ? themeColors.dark : themeColors.light);
  }
}

function initTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  const validThemes = ["light", "dark"];
  const theme = validThemes.includes(stored) ? stored : "light";
  if (themeSelector) themeSelector.value = theme;
  applyTheme(theme);
}

if (themeSelector) {
  themeSelector.addEventListener("change", () => {
    const theme = themeSelector.value;
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
  });
}

initTheme();

const form = document.querySelector("#todo-form");
const input = document.querySelector("#todo-input");
const priorityInput = document.querySelector("#todo-priority");
const categoryInput = document.querySelector("#todo-category");
const dueInput = document.querySelector("#todo-due");
const list = document.querySelector("#todo-list");
const emptyState = document.querySelector("#empty-state");
const totalCount = document.querySelector("#total-count");
const activeCount = document.querySelector("#active-count");
const clearCompleted = document.querySelector("#clear-completed");
const priorityFilter = document.querySelector("#priority-filter");
const categoryFilter = document.querySelector("#category-filter");
const dueFilter = document.querySelector("#due-filter");
const exportBackupButton = document.querySelector("#export-backup");
const importBackupButton = document.querySelector("#import-backup");
const importFileInput = document.querySelector("#import-file");
const statusMessage = document.querySelector("#status-message");
const importDialog = document.querySelector("#import-dialog");
const dialogTitle = document.querySelector("#dialog-title");
const dialogMessage = document.querySelector("#dialog-message");
const dialogConfirm = document.querySelector("#dialog-confirm");
const dialogCancel = document.querySelector("#dialog-cancel");

function loadTodos() {
  try {
    const savedTodos = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(savedTodos)) return [];
    const normalizedTodos = savedTodos.map((todo, index) => ({
      ...todo,
      priority: ["low", "medium", "high"].includes(todo.priority) ? todo.priority : "medium",
      category: ["personal", "work", "shopping", "other"].includes(todo.category) ? todo.category : "personal",
      order: todo.order ?? index,
      dueDate: todo.dueDate || null
    }));
    if (JSON.stringify(normalizedTodos) !== JSON.stringify(savedTodos)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedTodos));
    }
    return normalizedTodos;
  } catch {
    return [];
  }
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function visibleTodos() {
  return todos.filter((todo) => {
    const statusMatches = currentStatusFilter === "all"
      || (currentStatusFilter === "active" && !todo.completed)
      || (currentStatusFilter === "completed" && todo.completed);
    const priorityMatches = priorityFilter.value === "all" || todo.priority === priorityFilter.value;
    const categoryMatches = categoryFilter.value === "all" || todo.category === categoryFilter.value;
    const dueMatches = matchesDueFilter(todo);
    return statusMatches && priorityMatches && categoryMatches && dueMatches;
  }).sort((a, b) => a.order - b.order);
}

function matchesDueFilter(todo) {
  if (dueFilter.value === "all") return true;
  if (!todo.dueDate) return dueFilter.value === "none";
  const today = new Date();
  const todayStr = formatDateISO(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDateISO(tomorrow);
  const dueStr = todo.dueDate;
  if (dueFilter.value === "today") return dueStr === todayStr;
  if (dueFilter.value === "overdue") return dueStr < todayStr;
  if (dueFilter.value === "upcoming") return dueStr >= tomorrowStr;
  return true;
}

function formatDateISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDueDateLabel(todo) {
  if (!todo.dueDate) return null;
  const today = formatDateISO(new Date());
  const tomorrow = formatDateISO(new Date(Date.now() + 86400000));
  if (todo.dueDate === today) return "Due today";
  if (todo.dueDate === tomorrow) return "Due tomorrow";
  if (todo.dueDate < today) return "Overdue";
  return todo.dueDate;
}

function render() {
  const filteredTodos = visibleTodos();
  list.replaceChildren();

  filteredTodos.forEach((todo) => {
    const item = document.createElement("li");
    item.className = `todo-item${todo.completed ? " is-completed" : ""}`;
    item.dataset.id = todo.id;

    if (item.dataset.id === editingId) {
      renderEditForm(item, todo);
      list.append(item);
      return;
    }

    const checkbox = document.createElement("input");
    checkbox.className = "todo-check";
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;
    checkbox.setAttribute("aria-label", `Mark ${todo.text} as ${todo.completed ? "active" : "completed"}`);

    const details = document.createElement("div");
    details.className = "todo-details";
    const text = document.createElement("span");
    text.className = "todo-text";
    text.textContent = todo.text;

    const meta = document.createElement("span");
    meta.className = "todo-meta";
    const category = document.createElement("span");
    category.className = "todo-badge";
    category.textContent = capitalize(todo.category);
    const priority = document.createElement("span");
    priority.className = `todo-badge priority-indicator priority-${todo.priority}`;
    priority.textContent = `${capitalize(todo.priority)} priority`;
    meta.append(category, priority);
    const dueLabel = getDueDateLabel(todo);
    if (dueLabel) {
      const dueBadge = document.createElement("span");
      dueBadge.className = `todo-badge${todo.dueDate < formatDateISO(new Date()) ? " is-overdue" : todo.dueDate === formatDateISO(new Date()) ? " is-due-today" : " is-upcoming"}`;
      dueBadge.textContent = dueLabel;
      meta.append(dueBadge);
    }
    details.append(text, meta);

    const actions = document.createElement("span");
    actions.className = "todo-actions";
    const moveUpButton = document.createElement("button");
    moveUpButton.className = "move-button";
    moveUpButton.type = "button";
    moveUpButton.dataset.action = "move-up";
    moveUpButton.setAttribute("aria-label", `Move ${todo.text} up`);
    moveUpButton.innerHTML = "&#9650;";
    const moveDownButton = document.createElement("button");
    moveDownButton.className = "move-button";
    moveDownButton.type = "button";
    moveDownButton.dataset.action = "move-down";
    moveDownButton.setAttribute("aria-label", `Move ${todo.text} down`);
    moveDownButton.innerHTML = "&#9660;";
    const editButton = document.createElement("button");
    editButton.className = "edit-button";
    editButton.type = "button";
    editButton.dataset.action = "edit";
    editButton.setAttribute("aria-label", `Edit ${todo.text}`);
    editButton.textContent = "Edit";
    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.dataset.action = "delete";
    deleteButton.setAttribute("aria-label", `Delete ${todo.text}`);
    deleteButton.innerHTML = "&#10005;";

    actions.append(moveUpButton, moveDownButton, editButton, deleteButton);
    item.append(checkbox, details, actions);
    list.append(item);
  });

  totalCount.textContent = todos.length;
  activeCount.textContent = todos.filter((todo) => !todo.completed).length;
  emptyState.classList.toggle("is-hidden", filteredTodos.length > 0);
  if (filteredTodos.length === 0) {
    if (todos.length === 0) {
      emptyState.textContent = "No todos yet. Add one small thing to begin.";
    } else if (dueFilter.value !== "all") {
      emptyState.textContent = "No todos match the selected due date filter.";
    } else if (priorityFilter.value !== "all" || categoryFilter.value !== "all") {
      emptyState.textContent = "No todos match these filters.";
    } else if (currentStatusFilter === "active") {
      emptyState.textContent = "No active todos. Nice work.";
    } else if (currentStatusFilter === "completed") {
      emptyState.textContent = "No completed todos yet.";
    }
  }
  clearCompleted.disabled = !todos.some((todo) => todo.completed);
}

let editingId = null;

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function moveTodo(id, direction) {
  const visible = visibleTodos();
  const currentIndex = visible.findIndex((todo) => todo.id === id);
  if (currentIndex === -1) return;
  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= visible.length) return;
  const currentOrder = visible[currentIndex].order;
  const targetOrder = visible[targetIndex].order;
  const currentTodo = todos.find((todo) => todo.id === id);
  const targetTodo = todos.find((todo) => todo.id === visible[targetIndex].id);
  if (currentTodo && targetTodo) {
    const temp = currentTodo.order;
    currentTodo.order = targetTodo.order;
    targetTodo.order = temp;
    saveTodos();
    render();
  }
}

function renderEditForm(item, todo) {
  const editForm = document.createElement("form");
  editForm.className = "edit-form";
  editForm.dataset.action = "save-edit";
  const editInput = document.createElement("input");
  editInput.type = "text";
  editInput.value = todo.text;
  editInput.maxLength = 200;
  editInput.required = true;
  editInput.setAttribute("aria-label", `Edit ${todo.text}`);
  const priority = createSelect("Priority", ["low", "medium", "high"], todo.priority);
  const category = createSelect("Category", ["personal", "work", "shopping", "other"], todo.category);
  const dueDateInput = document.createElement("input");
  dueDateInput.type = "date";
  dueDateInput.value = todo.dueDate || "";
  dueDateInput.setAttribute("aria-label", "Due date");
  const clearDueButton = document.createElement("button");
  clearDueButton.type = "button";
  clearDueButton.dataset.action = "clear-due";
  clearDueButton.textContent = "Clear date";
  const saveButton = document.createElement("button");
  saveButton.className = "save-edit";
  saveButton.type = "submit";
  saveButton.textContent = "Save";
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.dataset.action = "cancel-edit";
  cancelButton.textContent = "Cancel";
  editForm.append(editInput, priority, category, dueDateInput, clearDueButton, saveButton, cancelButton);
  item.replaceChildren(editForm);
  requestAnimationFrame(() => { editInput.focus(); editInput.select(); });
}

function createSelect(label, values, selected) {
  const select = document.createElement("select");
  select.name = label.toLowerCase();
  select.setAttribute("aria-label", label);
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label === "Priority" ? `${capitalize(value)} priority` : capitalize(value);
    option.selected = value === selected;
    select.append(option);
  });
  return select;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  const minOrder = todos.length > 0 ? Math.min(...todos.map((todo) => todo.order)) : 0;
  const dueDate = dueInput.value || null;
  todos.push({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, text, completed: false, priority: priorityInput.value, category: categoryInput.value, order: minOrder - 1, dueDate });
  saveTodos();
  render();
  form.reset();
  input.focus();
});

list.addEventListener("change", (event) => {
  if (!event.target.matches(".todo-check")) return;
  const item = event.target.closest(".todo-item");
  const todo = todos.find((candidate) => candidate.id === item.dataset.id);
  if (!todo) return;
  todo.completed = event.target.checked;
  saveTodos();
  render();
});

list.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]");
  if (!action) return;
  const item = action.closest(".todo-item");
  if (action.dataset.action === "move-up") {
    event.preventDefault();
    event.stopPropagation();
    moveTodo(item.dataset.id, -1);
    return;
  }
  if (action.dataset.action === "move-down") {
    event.preventDefault();
    event.stopPropagation();
    moveTodo(item.dataset.id, 1);
    return;
  }
  if (action.dataset.action === "clear-due") {
    event.preventDefault();
    event.stopPropagation();
    const todo = todos.find((candidate) => candidate.id === item.dataset.id);
    if (todo) {
      todo.dueDate = null;
      saveTodos();
      render();
    }
    return;
  }
  if (action.dataset.action === "edit") {
    editingId = item.dataset.id;
    render();
    return;
  }
  if (action.dataset.action === "cancel-edit") {
    editingId = null;
    render();
    return;
  }
  if (action.dataset.action !== "delete") return;
  todos = todos.filter((todo) => todo.id !== item.dataset.id);
  saveTodos();
  render();
});

list.addEventListener("submit", (event) => {
  if (!event.target.matches('[data-action="save-edit"]')) return;
  event.preventDefault();
  const item = event.target.closest(".todo-item");
  const todo = todos.find((candidate) => candidate.id === item.dataset.id);
  const text = event.target.elements["text"]?.value.trim() || event.target.querySelector("input").value.trim();
  if (!todo || !text) return;
  todo.text = text;
  todo.priority = event.target.querySelector('select[name="priority"]').value;
  todo.category = event.target.querySelector('select[name="category"]').value;
  const dueInput = event.target.querySelector('input[type="date"]');
  todo.dueDate = dueInput && dueInput.value ? dueInput.value : null;
  editingId = null;
  saveTodos();
  render();
});

document.querySelectorAll("[data-status-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    currentStatusFilter = button.dataset.statusFilter;
    document.querySelectorAll("[data-status-filter]").forEach((filterButton) => {
      const isSelected = filterButton === button;
      filterButton.classList.toggle("is-selected", isSelected);
      filterButton.setAttribute("aria-pressed", String(isSelected));
    });
    render();
  });
});

priorityFilter.addEventListener("change", render);
categoryFilter.addEventListener("change", render);
dueFilter.addEventListener("change", render);

clearCompleted.addEventListener("click", () => {
  todos = todos.filter((todo) => !todo.completed);
  saveTodos();
  render();
});

render();

let draggedItem = null;
let draggedId = null;
let startY = 0;
let startX = 0;
let isDragging = false;
const DRAG_THRESHOLD = 5;

list.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button, input, select")) return;
  const item = event.target.closest(".todo-item");
  if (!item) return;
  draggedItem = item;
  draggedId = item.dataset.id;
  startY = event.clientY;
  startX = event.clientX;
  isDragging = false;
  item.setPointerCapture(event.pointerId);
});

list.addEventListener("pointermove", (event) => {
  if (!draggedItem) return;
  const deltaY = Math.abs(event.clientY - startY);
  const deltaX = Math.abs(event.clientX - startX);
  if (!isDragging && (deltaY > DRAG_THRESHOLD || deltaX > DRAG_THRESHOLD)) {
    isDragging = true;
    draggedItem.classList.add("is-dragging");
    draggedItem.style.zIndex = "1000";
    draggedItem.style.touchAction = "none";
  }
  if (!isDragging) return;
  event.preventDefault();
  const items = Array.from(list.querySelectorAll(".todo-item:not(.is-dragging)"));
  items.forEach((item) => item.classList.remove("is-drop-target"));
  const afterElement = getDragAfterElement(list, event.clientY);
  if (afterElement) {
    afterElement.classList.add("is-drop-target");
  } else if (items.length > 0) {
    items[items.length - 1].classList.add("is-drop-target");
  }
});

list.addEventListener("pointerup", (event) => {
  if (!draggedItem) return;
  if (isDragging) {
    let afterElement = getDragAfterElement(list, event.clientY);
    if (!afterElement) {
      afterElement = list.querySelector(".todo-item.is-drop-target");
    }
    const draggedTodo = todos.find((todo) => todo.id === draggedId);
    if (draggedTodo && afterElement) {
      const targetId = afterElement.dataset.id;
      const targetTodo = todos.find((todo) => todo.id === targetId);
      if (targetTodo) {
        const temp = draggedTodo.order;
        draggedTodo.order = targetTodo.order;
        targetTodo.order = temp;
        saveTodos();
      }
    }
  }
  cleanupDrag();
});

list.addEventListener("pointercancel", () => {
  cleanupDrag();
});

list.addEventListener("pointerleave", () => {
  if (isDragging) cleanupDrag();
});

function cleanupDrag() {
  if (draggedItem) {
    draggedItem.classList.remove("is-dragging");
    draggedItem.style.zIndex = "";
    draggedItem.style.touchAction = "";
  }
  list.querySelectorAll(".is-drop-target").forEach((item) => item.classList.remove("is-drop-target"));
  draggedItem = null;
  draggedId = null;
  isDragging = false;
}

function getDragAfterElement(container, y) {
  const items = Array.from(container.querySelectorAll(".todo-item:not(.is-dragging)"));
  let closest = null;
  let closestOffset = Number.NEGATIVE_INFINITY;
  items.forEach((item) => {
    const box = item.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closestOffset) {
      closestOffset = offset;
      closest = item;
    }
  });
  return closest;
}

function showStatus(message, type) {
  if (!statusMessage) return;
  statusMessage.textContent = message;
  statusMessage.className = `status-message${type ? ` is-${type}` : ""}`;
  if (message) {
    statusMessage.classList.remove("is-hidden");
  } else {
    statusMessage.classList.add("is-hidden");
  }
}

function exportBackup() {
  const backup = {
    app: "myHandyHub",
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    todos: todos.map((todo) => ({
      id: todo.id,
      text: todo.text,
      completed: todo.completed,
      priority: todo.priority,
      category: todo.category,
      order: todo.order,
      dueDate: todo.dueDate
    }))
  };
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const filename = `myHandyHub-backup-${date}.json`;
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showStatus("Backup exported successfully.", "success");
}

function normalizeImportedTodo(todo, index) {
  return {
    id: String(todo.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    text: String(todo.text || "").trim(),
    completed: Boolean(todo.completed),
    priority: ["low", "medium", "high"].includes(todo.priority) ? todo.priority : "medium",
    category: ["personal", "work", "shopping", "other"].includes(todo.category) ? todo.category : "personal",
    order: typeof todo.order === "number" ? todo.order : index,
    dueDate: todo.dueDate || null
  };
}

function validateBackup(data) {
  if (!data || typeof data !== "object") return "Invalid backup file.";
  if (data.app !== "myHandyHub") return "This backup is not from myHandyHub.";
  if (typeof data.formatVersion !== "number") return "Invalid backup format version.";
  if (!Array.isArray(data.todos)) return "Invalid backup: todos must be an array.";
  if (data.todos.length === 0) return null;
  for (let i = 0; i < data.todos.length; i++) {
    const todo = data.todos[i];
    if (!todo || typeof todo !== "object") return `Invalid todo at index ${i}.`;
    if (typeof todo.text !== "string" || todo.text.trim() === "") return `Todo at index ${i} has invalid text.`;
  }
  return null;
}

let pendingImportTodos = null;

function confirmImport() {
  if (!pendingImportTodos || !importDialog) return;
  const normalized = pendingImportTodos.map((todo, index) => normalizeImportedTodo(todo, index));
  todos = normalized;
  saveTodos();
  render();
  closeDialog();
  showStatus(`${normalized.length} todos imported successfully.`, "success");
  pendingImportTodos = null;
}

function closeDialog() {
  if (!importDialog) return;
  importDialog.classList.remove("is-visible");
  importDialog.setAttribute("aria-hidden", "true");
  pendingImportTodos = null;
}

function openDialog() {
  if (!importDialog) return;
  importDialog.classList.add("is-visible");
  importDialog.setAttribute("aria-hidden", "false");
  if (dialogConfirm) dialogConfirm.focus();
}

function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      const error = validateBackup(data);
      if (error) {
        showStatus(error, "error");
        return;
      }
      pendingImportTodos = data.todos;
      if (dialogMessage) dialogMessage.textContent = `This will replace your current ${todos.length} todo(s) with ${data.todos.length} todo(s) from the backup. This action cannot be undone.`;
      if (dialogTitle) dialogTitle.textContent = `Import ${data.todos.length} Todo(s)?`;
      openDialog();
    } catch {
      showStatus("Invalid JSON file. Please select a valid backup file.", "error");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

if (exportBackupButton) {
  exportBackupButton.addEventListener("click", exportBackup);
}

if (importBackupButton && importFileInput) {
  importBackupButton.addEventListener("click", () => importFileInput.click());
  importFileInput.addEventListener("change", handleImportFile);
}

if (dialogConfirm) {
  dialogConfirm.addEventListener("click", confirmImport);
}

if (dialogCancel) {
  dialogCancel.addEventListener("click", closeDialog);
}

if (importDialog) {
  importDialog.addEventListener("click", (event) => {
    if (event.target === importDialog) closeDialog();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && importDialog && importDialog.classList.contains("is-visible")) {
    closeDialog();
  }
});

function exportShoppingData() {
  shopLoad();
  const backup = {
    app: "myHandyHub",
    appType: "Shopping",
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    shopping: shop.data
  };
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const filename = `myHandyHub-shopping-${date}.json`;
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportLinksData() {
  linksLoad();
  const backup = {
    app: "myHandyHub",
    appType: "Links",
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    links: links.data
  };
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const filename = `myHandyHub-links-${date}.json`;
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportNotesData() {
  notesLoad();
  const backup = {
    app: "myHandyHub",
    appType: "Notes",
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    notes: notes.data
  };
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const filename = `myHandyHub-notes-${date}.json`;
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const shopExportBtn = document.querySelector("#shop-export");
const linksExportBtn = document.querySelector("#links-export");
const notesExportBtn = document.querySelector("#notes-export");

if (shopExportBtn) shopExportBtn.addEventListener("click", exportShoppingData);
if (linksExportBtn) linksExportBtn.addEventListener("click", exportLinksData);
if (notesExportBtn) notesExportBtn.addEventListener("click", exportNotesData);

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const money = (n) => (Number(n) || 0).toFixed(2);
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function storeGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
}
function storeSet(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

const APP_VIEWS = {
  todos: { panel: "view-todos", init: initTodos },
  shopping: { panel: "view-shopping", init: initShopping },
  links: { panel: "view-links", init: initLinks },
  notes: { panel: "view-notes", init: initNotes },
};

function initTodos() {}

function showApp(name) {
  const app = APP_VIEWS[name];
  if (!app) return;
  Object.values(APP_VIEWS).forEach((a) => {
    const panel = document.getElementById(a.panel);
    if (panel) panel.classList.add("is-hidden");
  });
  const active = document.getElementById(app.panel);
  if (active) active.classList.remove("is-hidden");
  document.querySelectorAll(".tab").forEach((tab) => {
    const selected = tab.dataset.app === name;
    tab.classList.toggle("is-selected", selected);
    tab.setAttribute("aria-selected", selected ? "true" : "false");
  });
  if (typeof app.init === "function") app.init();
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => showApp(tab.dataset.app));
});

showApp("todos");

const SHOP_KEY = "_myHandyHub.shopping";
const SHOP_CATS = ["Food", "Drinks", "Cleaning", "Other"];
const shop = { inited: false, data: null, editingId: null, sort: "item" };

function shopLoad() {
  if (!shop.data) {
    shop.data = storeGet(SHOP_KEY, { lists: [], activeId: null });
    if (!shop.data.lists.length) {
      const id = uid();
      shop.data.lists.push({ id, name: "Supermarket", category: "", discount: 0, budget: 0, items: [] });
      shop.data.activeId = id;
    }
  }
  return shop.data;
}
function shopSave() { storeSet(SHOP_KEY, shop.data); }
function shopActive() { return shop.data.lists.find((l) => l.id === shop.data.activeId) || shop.data.lists[0]; }
function shopHistory() { return storeGet("_myHandyHub.priceHistory", {}); }
function shopRecordPrice(name, price) {
  const h = shopHistory();
  const k = (name || "").toLowerCase();
  h[k] = h[k] || [];
  h[k].push(Number(price));
  storeSet("_myHandyHub.priceHistory", h);
}
function shopLastPrice(name) {
  const arr = shopHistory()[(name || "").toLowerCase()] || [];
  return arr.length ? arr[arr.length - 1] : null;
}
function priceDelta(name, current) {
  const last = shopLastPrice(name);
  if (last == null || Number(last) === Number(current)) return "";
  const d = Number(current) - Number(last);
  const pct = last ? (d / Number(last)) * 100 : 0;
  const arrow = d > 0 ? "▲" : "▼";
  return `<span class="delta ${d > 0 ? "up" : "down"}">${arrow} ${money(Math.abs(d))} (${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%)</span>`;
}

function renderShopping() {
  shopLoad();
  const root = document.getElementById("shopping-app");
  const list = shopActive();
  const lists = shop.data.lists;
  const items = (list.items || []).slice().sort((a, b) =>
    shop.sort === "category"
      ? (a.category || "").localeCompare(b.category || "") || a.name.localeCompare(b.name)
      : a.name.localeCompare(b.name));
  const subtotal = items.reduce((s, it) => s + Number(it.qty) * Number(it.price), 0);
  const discount = Number(list.discount) || 0;
  const total = subtotal - discount;
  const editing = shop.editingId ? items.find((i) => i.id === shop.editingId) : null;

  root.innerHTML = `
    <div class="app-bar">
      <select id="shop-list">${lists.map((l) => `<option value="${l.id}" ${l.id === list.id ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</select>
      <button class="ghost" data-act="new-list">+ List</button>
      <button class="ghost danger" data-act="del-list">Delete</button>
    </div>
    <form id="shop-form" class="item-form">
      <input name="name" placeholder="Item" value="${editing ? esc(editing.name) : ""}" required>
      <input name="qty" type="number" step="0.10" min="0.10" placeholder="Qty" value="${editing ? editing.qty : ""}" required>
      <input name="unit" placeholder="Unit" value="${editing ? esc(editing.unit) : ""}">
      <input name="price" type="number" step="0.05" min="0.05" placeholder="Price" value="${editing ? editing.price : ""}" required>
      <select name="category">${SHOP_CATS.map((c) => `<option ${editing && editing.category === c ? "selected" : ""}>${c}</option>`).join("")}</select>
      <button type="submit" class="add-button">${editing ? "Save" : "Add"}</button>
      ${editing ? '<button type="button" class="ghost" data-act="cancel">Cancel</button>' : ""}
    </form>
    <div class="app-bar">
      <label class="muted">Sort
        <select id="shop-sort">
          <option value="item" ${shop.sort === "item" ? "selected" : ""}>Item</option>
          <option value="category" ${shop.sort === "category" ? "selected" : ""}>Category</option>
        </select>
      </label>
      <button class="ghost" data-act="clear-bought">Clear bought</button>
      <label class="muted">Budget <input id="shop-budget" type="number" step="0.01" min="0" value="${list.budget || ""}"></label>
      <label class="muted">Discount <input id="shop-discount" type="number" step="0.01" min="0" value="${list.discount || ""}"></label>
    </div>
    <ul class="item-list">
      ${items.length ? items.map((it) => `
        <li class="item ${it.bought ? "is-bought" : ""}">
          <label class="item-main">
            <input type="checkbox" data-act="bought" data-id="${it.id}" ${it.bought ? "checked" : ""}>
            <span class="item-name">${esc(it.name)}</span>
            <span class="muted">${esc(it.qty)} ${esc(it.unit)}</span>
            <span class="muted">${money(it.price)}/u</span>
            <span class="item-total">${money(Number(it.qty) * Number(it.price))}</span>
            ${it.bought ? "" : priceDelta(it.name, it.price)}
          </label>
          <span class="row-actions">
            <button class="ghost" data-act="edit" data-id="${it.id}">Edit</button>
            <button class="ghost danger" data-act="del" data-id="${it.id}">Del</button>
          </span>
        </li>`).join("") : '<li class="empty">No items yet.</li>'}
    </ul>
    <div class="totals">
      <span>Items: <strong>${items.length}</strong></span>
      <span>Subtotal: <strong>${money(subtotal)}</strong></span>
      ${discount ? `<span>Discount: <strong>-${money(discount)}</strong></span>` : ""}
      <span>Total: <strong>${money(total)}</strong></span>
    </div>
    ${Number(list.budget) ? `<div class="budget">Budget ${money(list.budget)} · Spent ${money(total)} · Remaining <strong>${money(list.budget - total)}</strong></div>` : ""}
  `;
  
  const shopPending = document.getElementById("shop-pending");
  const shopTotal = document.getElementById("shop-total");
  const pendingCount = items.filter(i => !i.bought).length;
  if (shopPending) shopPending.textContent = pendingCount;
  if (shopTotal) shopTotal.textContent = items.length;
}

function initShopping() {
  shopLoad();
  if (shop.inited) { renderShopping(); return; }
  shop.inited = true;
  const root = document.getElementById("shopping-app");
  root.addEventListener("submit", (e) => {
    if (e.target.id !== "shop-form") return;
    e.preventDefault();
    const f = e.target;
    const list = shopActive();
    const prev = shop.editingId ? list.items.find((i) => i.id === shop.editingId) : null;
    const item = {
      id: shop.editingId || uid(),
      name: f.name.value.trim(),
      qty: Number(f.qty.value) || 0,
      unit: f.unit.value.trim(),
      price: Number(f.price.value) || 0,
      category: f.category.value,
      bought: prev ? prev.bought : false,
    };
    if (!item.name) return;
    if (item.qty <= 0) { alert("Quantity must be greater than 0"); return; }
    if (item.price <= 0) { alert("Price must be greater than 0"); return; }
    if (shop.editingId) {
      const idx = list.items.findIndex((i) => i.id === shop.editingId);
      if (idx > -1) list.items[idx] = item;
    } else {
      list.items.push(item);
    }
    shopRecordPrice(item.name, item.price);
    shop.editingId = null;
    shopSave();
    renderShopping();
  });
  root.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    const list = shopActive();
    if (act === "new-list") {
      const dialog = document.getElementById("list-dialog");
      const input = document.getElementById("list-name");
      if (dialog && input) {
        input.value = "";
        dialog.classList.add("is-visible");
        dialog.setAttribute("aria-hidden", "false");
        input.focus();
      }
    } else if (act === "del-list") {
      const confirmDialog = document.getElementById("confirm-dialog");
      const confirmMessage = document.getElementById("confirm-dialog-message");
      const confirmOk = document.getElementById("confirm-dialog-ok");
      if (confirmDialog && confirmMessage && confirmOk) {
        confirmMessage.textContent = "Delete this list?";
        confirmOk.onclick = () => {
          if (shop.data.lists.length > 1) {
            shop.data.lists = shop.data.lists.filter((l) => l.id !== list.id);
            shop.data.activeId = shop.data.lists[0].id;
            shopSave();
            renderShopping();
          }
          confirmDialog.classList.remove("is-visible");
          confirmDialog.setAttribute("aria-hidden", "true");
        };
        confirmDialog.classList.add("is-visible");
        confirmDialog.setAttribute("aria-hidden", "false");
      }
    } else if (act === "clear-bought") {
      list.items = list.items.filter((i) => !i.bought); shopSave(); renderShopping();
    } else if (act === "cancel") { shop.editingId = null; renderShopping(); }
    else if (act === "edit") { shop.editingId = btn.dataset.id; renderShopping(); }
    else if (act === "del") { list.items = list.items.filter((i) => i.id !== btn.dataset.id); shopSave(); renderShopping(); }
  });

  const listDialog = document.getElementById("list-dialog");
  const listForm = document.getElementById("list-form");
  if (listForm) {
    listForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = (listForm.name && listForm.name.value.trim()) || "";
      if (!name) return;
      const id = uid();
      shop.data.lists.push({ id, name, category: "", discount: 0, budget: 0, items: [] });
      shop.data.activeId = id;
      shopSave();
      renderShopping();
      if (listDialog) { listDialog.classList.remove("is-visible"); listDialog.setAttribute("aria-hidden", "true"); }
    });
  }
  if (listDialog) {
    listDialog.addEventListener("click", (e) => {
      if (e.target.matches('[data-close="list-dialog"]') || e.target === listDialog) {
        listDialog.classList.remove("is-visible");
        listDialog.setAttribute("aria-hidden", "true");
      }
    });
  }
  const confirmDialog = document.getElementById("confirm-dialog");
  if (confirmDialog) {
    confirmDialog.addEventListener("click", (e) => {
      if (e.target.matches('[data-close="confirm-dialog"]') || e.target === confirmDialog) {
        confirmDialog.classList.remove("is-visible");
        confirmDialog.setAttribute("aria-hidden", "true");
      }
    });
  }
  root.addEventListener("change", (e) => {
    if (e.target.id === "shop-list") { shop.data.activeId = e.target.value; shop.editingId = null; shopSave(); renderShopping(); }
    else if (e.target.id === "shop-sort") { shop.sort = e.target.value; renderShopping(); }
    else if (e.target.id === "shop-budget") { shopActive().budget = Number(e.target.value) || 0; shopSave(); renderShopping(); }
    else if (e.target.id === "shop-discount") { shopActive().discount = Number(e.target.value) || 0; shopSave(); renderShopping(); }
    else if (e.target.matches('[data-act="bought"]')) {
      const it = shopActive().items.find((i) => i.id === e.target.dataset.id);
      if (it) { it.bought = e.target.checked; shopSave(); renderShopping(); }
    }
  });
  renderShopping();
}

const LINKS_KEY = "_myHandyHub.links";
const LINK_CATS = ["Work", "Shopping", "Finance", "Travel", "Tools", "Other"];
const links = { inited: false, data: null, filter: "all", q: "", editingId: null };

function linksLoad() { if (!links.data) links.data = storeGet(LINKS_KEY, []); return links.data; }
function linksSave() { storeSet(LINKS_KEY, links.data); }
function domainOf(url) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return ""; } }

function renderLinks() {
  linksLoad();
  const root = document.getElementById("links-app");
  const q = links.q.toLowerCase();
  const filtered = links.data.filter((l) => {
    if (links.filter === "fav" && !l.favorite) return false;
    if (["Work", "Shopping", "Finance", "Travel", "Tools", "Other"].includes(links.filter) && l.category !== links.filter) return false;
    if (q && !(`${l.name} ${l.url} ${l.notes || ""} ${(l.tags || []).join(" ")}`.toLowerCase().includes(q))) return false;
    return true;
  }).sort((a, b) => (b.favorite - a.favorite) || a.name.localeCompare(b.name));

  const editing = links.editingId ? links.data.find((x) => x.id === links.editingId) : null;

  root.innerHTML = `
    <form id="link-form" class="item-form">
      <input name="url" placeholder="https://…" value="${editing ? esc(editing.url) : ""}" required pattern="https?://.+" title="URL must start with http(s)://">
      <input name="name" placeholder="Name" value="${editing ? esc(editing.name) : ""}" required>
      <select name="category">
        <option>Work</option>
        <option>Shopping</option>
        <option>Finance</option>
        <option>Travel</option>
        <option>Tools</option>
        <option>Other</option>
      </select>
      <input name="tags" placeholder="tags (comma)" value="${editing ? esc((editing.tags || []).join(", ")) : ""}">
      <input name="notes" placeholder="notes" value="${editing ? esc(editing.notes || "") : ""}">
      <button type="submit" class="add-button">${editing ? "Save" : "Add"}</button>
      ${editing ? '<button type="button" class="ghost" data-act="cancel-edit">Cancel</button>' : ""}
    </form>
    <div class="app-bar">
      <input id="link-search" placeholder="Search…" value="${esc(links.q)}">
      <select id="link-filter">
        <option value="all" ${links.filter === "all" ? "selected" : ""}>All</option>
        <option value="fav" ${links.filter === "fav" ? "selected" : ""}>⭐ Favorites</option>
        ${LINK_CATS.map((c) => `<option value="${c}" ${links.filter === c ? "selected" : ""}>${c}</option>`).join("")}
      </select>
    </div>
    <ul class="item-list">
      ${filtered.length ? filtered.map((l) => `
        <li class="item">
          <div class="item-main">
            <span class="item-name">${l.favorite ? "⭐ " : ""}${esc(l.name)}</span>
            <span class="muted">${esc(domainOf(l.url))}</span>
            ${(l.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}
          </div>
          <span class="row-actions">
            <a class="ghost" href="${esc(l.url)}" target="_blank" rel="noopener">Open</a>
            <button class="ghost" data-act="copy" data-id="${l.id}">Copy</button>
            <button class="ghost" data-act="share" data-id="${l.id}">Share</button>
            <button class="ghost" data-act="fav" data-id="${l.id}">${l.favorite ? "Unfav" : "Fav"}</button>
            <button class="ghost" data-act="edit" data-id="${l.id}">Edit</button>
            <button class="ghost danger" data-act="del" data-id="${l.id}">Del</button>
          </span>
        </li>`).join("") : '<li class="empty">No links yet.</li>'}
    </ul>
  `;
  
  const linksCount = document.getElementById("links-count");
  if (linksCount) linksCount.textContent = links.data.length;
}

function initLinks() {
  linksLoad();
  if (links.inited) { renderLinks(); return; }
  links.inited = true;
  const root = document.getElementById("links-app");
  root.addEventListener("submit", (e) => {
    if (e.target.id !== "link-form") return;
    e.preventDefault();
    const f = e.target;
    const url = f.url.value.trim();
    if (!/^https?:\/\//i.test(url)) { f.url.setCustomValidity("URL must start with http(s)://"); f.url.reportValidity(); return; }
    f.url.setCustomValidity("");
    if (links.editingId) {
      const item = links.data.find((x) => x.id === links.editingId);
      if (item) {
        item.name = f.name.value.trim() || domainOf(url);
        item.url = url;
        item.category = f.category.value;
        item.tags = f.tags.value.split(",").map((t) => t.trim()).filter(Boolean);
        item.notes = f.notes.value.trim();
      }
      links.editingId = null;
    } else {
      links.data.push({ id: uid(), name: f.name.value.trim() || domainOf(url), url, category: f.category.value, tags: f.tags.value.split(",").map((t) => t.trim()).filter(Boolean), notes: f.notes.value.trim(), favorite: false, date: new Date().toISOString() });
    }
    linksSave(); renderLinks();
  });
  root.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    const l = links.data.find((x) => x.id === btn.dataset.id);
    if (!l) return;
    if (act === "copy") { try { await navigator.clipboard.writeText(l.url); btn.textContent = "Copied"; setTimeout(() => renderLinks(), 800); } catch (err) { alert(l.url); } }
    else if (act === "share") { if (navigator.share) { try { await navigator.share({ title: l.name, url: l.url }); } catch (err) {} } else { alert(l.url); } }
    else if (act === "fav") { l.favorite = !l.favorite; linksSave(); renderLinks(); }
    else if (act === "del") { links.data = links.data.filter((x) => x.id !== l.id); linksSave(); renderLinks(); }
    else if (act === "edit") {
      links.editingId = l.id;
      renderLinks();
    }
    else if (act === "cancel-edit") {
      links.editingId = null;
      renderLinks();
    }
  });
  root.addEventListener("input", (e) => {
    if (e.target.id === "link-search") { links.q = e.target.value; renderLinks(); }
  });
  root.addEventListener("change", (e) => {
    if (e.target.id === "link-filter") { links.filter = e.target.value; renderLinks(); }
  });
  renderLinks();
}

const NOTES_KEY = "_myHandyHub.notes";
const NOTE_COLORS = ["", "#fde8e3", "#e3f0fd", "#eafde3", "#f3e3fd"];
const notes = { inited: false, data: null, favOnly: false, q: "", editingId: null };

function notesLoad() { if (!notes.data) notes.data = storeGet(NOTES_KEY, []); return notes.data; }
function notesSave() { storeSet(NOTES_KEY, notes.data); }
function noteStyle(n) {
  const c = NOTE_COLORS[n.color || 0] || null;
  return c ? `border-left-color:${c};background:${c}22;` : "border-left-color:var(--border-default);";
}

function renderNotes() {
  notesLoad();
  const root = document.getElementById("notes-app");
  const q = notes.q.toLowerCase();
  const filtered = notes.data.filter((n) => {
    if (notes.favOnly && !n.favorite) return false;
    if (q && !(`${n.title} ${n.text} ${(n.tags || []).join(" ")}`.toLowerCase().includes(q))) return false;
    return true;
  }).sort((a, b) => (b.favorite - a.favorite) || (b.updated || "").localeCompare(a.updated || ""));

  const editing = notes.editingId ? notes.data.find((n) => n.id === notes.editingId) : null;

  root.innerHTML = `
    <form id="note-form" class="item-form note-form">
      <input name="title" class="note-title" placeholder="Title" value="${editing ? esc(editing.title) : ""}" required>
      <textarea name="text" class="note-text" placeholder="Note…" rows="4">${editing ? esc(editing.text || "") : ""}</textarea>
      <div class="note-row">
        <select name="color">${NOTE_COLORS.map((c, i) => `<option value="${i}" ${(editing ? editing.color : 0) === i ? "selected" : ""}>${c ? "Color " + i : "Default"}</option>`).join("")}</select>
        <input name="tags" placeholder="tags" value="${editing ? esc((editing.tags || []).join(", ")) : ""}">
        <button type="submit" class="add-button">${editing ? "Save" : "Add"}</button>
        ${editing ? '<button type="button" class="ghost" data-act="cancel-edit">Cancel</button>' : ""}
      </div>
    </form>
    <div class="app-bar">
      <input id="note-search" placeholder="Search…" value="${esc(notes.q)}">
      <button class="ghost" data-act="favonly">${notes.favOnly ? "All" : "Favorites"}</button>
    </div>
    <ul class="item-list">
      ${filtered.length ? filtered.map((n) => `
        <li class="item note" style="${noteStyle(n)}">
          <div class="item-main">
            <span class="item-name">${n.favorite ? "📌 " : ""}${esc(n.title)}</span>
            <span class="muted">${esc((n.text || "").slice(0, 80))}</span>
            ${(n.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}
            <span class="muted tiny">${n.updated ? new Date(n.updated).toLocaleDateString() : ""}</span>
          </div>
          <span class="row-actions">
            <button class="ghost" data-act="fav" data-id="${n.id}">${n.favorite ? "Unpin" : "Pin"}</button>
            <button class="ghost" data-act="edit" data-id="${n.id}">Edit</button>
            <button class="ghost danger" data-act="del" data-id="${n.id}">Del</button>
          </span>
        </li>`).join("") : '<li class="empty">No notes yet.</li>'}
    </ul>
  `;
  
  const notesCount = document.getElementById("notes-count");
  if (notesCount) notesCount.textContent = notes.data.length;
}

function initNotes() {
  notesLoad();
  if (notes.inited) { renderNotes(); return; }
  notes.inited = true;
  const root = document.getElementById("notes-app");
  root.addEventListener("submit", (e) => {
    if (e.target.id !== "note-form") return;
    e.preventDefault();
    const f = e.target;
    const now = new Date().toISOString();
    if (notes.editingId) {
      const item = notes.data.find((x) => x.id === notes.editingId);
      if (item) {
        item.title = f.title.value.trim();
        item.text = f.text.value.trim();
        item.color = Number(f.color.value) || 0;
        item.tags = f.tags.value.split(",").map((t) => t.trim()).filter(Boolean);
        item.updated = now;
      }
      notes.editingId = null;
    } else {
      notes.data.push({ id: uid(), title: f.title.value.trim(), text: f.text.value.trim(), color: Number(f.color.value) || 0, tags: f.tags.value.split(",").map((t) => t.trim()).filter(Boolean), favorite: false, created: now, updated: now });
    }
    notesSave(); renderNotes();
  });
  root.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === "favonly") { notes.favOnly = !notes.favOnly; renderNotes(); return; }
    const n = notes.data.find((x) => x.id === btn.dataset.id);
    if (!n) return;
    if (act === "fav") { n.favorite = !n.favorite; notesSave(); renderNotes(); }
    else if (act === "del") { notes.data = notes.data.filter((x) => x.id !== n.id); notesSave(); renderNotes(); }
    else if (act === "edit") {
      notes.editingId = n.id;
      renderNotes();
    }
    else if (act === "cancel-edit") {
      notes.editingId = null;
      renderNotes();
    }
  });

  root.addEventListener("input", (e) => {
    if (e.target.id === "note-search") { notes.q = e.target.value; renderNotes(); }
  });
  renderNotes();
}

// Register the service worker only when the browser supports offline caching.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  });
}
