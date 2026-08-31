const STORAGE_KEY = "_myTodoHUB.todos";
const THEME_KEY = "_myTodoHUB.theme";
let todos = loadTodos();
let currentStatusFilter = "all";

const themeSelector = document.querySelector("#theme-selector");
const themeColors = { light: "#f5f1e8", dark: "#141816" };

function applyTheme(theme) {
  const root = document.documentElement;
  const effectiveTheme = theme === "dark" ? "dark" : "light";
  root.setAttribute("data-theme", effectiveTheme);
  root.removeAttribute("data-color-scheme");
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
    app: "_myTodoHUB",
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
  const filename = `_myTodoHUB-backup-${date}.json`;
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
  if (data.app !== "_myTodoHUB") return "This backup is not from _myTodoHUB.";
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

// Register the service worker only when the browser supports offline caching.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  });
}
