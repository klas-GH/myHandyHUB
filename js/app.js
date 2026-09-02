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

// ==================== Micro-interactions System ====================

// Toast Notifications
const toastContainer = document.querySelector("#toast-container");

function showToast(message, type = "info", duration = 3000) {
  if (!toastContainer) return;
  const toast = document.createElement("div");
  toast.className = `toast is-${type}`;
  toast.textContent = message;
  toast.setAttribute("role", "status");
  toastContainer.appendChild(toast);
  
  if (duration > 0) {
    setTimeout(() => {
      toast.classList.add("is-hiding");
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
  
  return toast;
}

// Sticky Header with Hide-on-Scroll
let lastScrollTop = 0;
const header = document.querySelector(".site-header");

function initStickyHeader() {
  if (!header) return;
  window.addEventListener("scroll", () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop > lastScrollTop + 10) {
      // Scrolling down - hide
      header.classList.add("is-hidden");
    } else if (scrollTop < lastScrollTop - 10) {
      // Scrolling up - show
      header.classList.remove("is-hidden");
    }
    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
  });
}

initStickyHeader();

// ==================== Smart Grouping System ====================

const groupCollapseState = JSON.parse(localStorage.getItem("myHandyHub.groupCollapse") || "{}");

function saveGroupState() {
  localStorage.setItem("myHandyHub.groupCollapse", JSON.stringify(groupCollapseState));
}

function toggleGroupCollapse(groupId) {
  groupCollapseState[groupId] = !groupCollapseState[groupId];
  saveGroupState();
}

function isGroupCollapsed(groupId) {
  return groupCollapseState[groupId] === true;
}

function renderGroupHeader(groupName, itemCount, groupId) {
  const isCollapsed = isGroupCollapsed(groupId);
  return `<div class="group-header ${isCollapsed ? 'is-collapsed' : ''}" data-group-id="${groupId}" data-toggle="group-header">
    ${esc(groupName)} <span class="group-badge">${itemCount}</span>
  </div>`;
}

function renderGroupContent(items, renderItemFn, groupId, emptyMessage = "No items") {
  const isCollapsed = isGroupCollapsed(groupId);
  const content = items.length ? items.map(renderItemFn).join("") : `<div class="group-empty">${emptyMessage}</div>`;
  return `<div class="group-content ${isCollapsed ? 'is-collapsed' : ''}" data-group-id="${groupId}">
    ${content}
  </div>`;
}

function initGroupCollapse() {
  document.addEventListener("click", (e) => {
    const header = e.target.closest("[data-toggle='group-header']");
    if (!header) return;
    const groupId = header.dataset.groupId;
    if (groupId) {
      toggleGroupCollapse(groupId);
      header.classList.toggle("is-collapsed");
      const content = document.querySelector(`[data-group-id="${groupId}"].group-content`);
      if (content) {
        content.classList.toggle("is-collapsed");
      }
    }
  });
}

initGroupCollapse();

// ============================================================

// Swipe-to-Delete Handler
let swipeStartX = 0;
let swipeStartY = 0;
let swipeElement = null;
let isSwipingDelete = false;

function handleSwipeStart(e, listSelector, itemSelector) {
  const touch = e.touches?.[0];
  if (!touch) return;
  swipeStartX = touch.clientX;
  swipeStartY = touch.clientY;
  swipeElement = e.target.closest(itemSelector);
  isSwipingDelete = false;
}

function handleSwipeMove(e, listSelector, itemSelector) {
  if (!swipeElement || !e.touches) return;
  const touch = e.touches[0];
  const deltaX = touch.clientX - swipeStartX;
  const deltaY = touch.clientY - swipeStartY;
  
  if (Math.abs(deltaY) > Math.abs(deltaX)) return; // Vertical scroll
  
  if (deltaX < -30) {
    isSwipingDelete = true;
    swipeElement.classList.add("is-swiping");
  } else {
    swipeElement.classList.remove("is-swiping");
  }
}

function handleSwipeEnd(e, listSelector, itemSelector, deleteHandler) {
  if (!swipeElement) return;
  swipeElement.classList.remove("is-swiping");
  
  if (isSwipingDelete) {
    deleteHandler(swipeElement);
  }
  
  swipeElement = null;
  isSwipingDelete = false;
}

// Animation completion handler
function animateItemCompletion(item, onAnimationComplete) {
  item.classList.add("is-completed");
  setTimeout(() => {
    if (onAnimationComplete) onAnimationComplete();
  }, 400);
}

// ============================================================


const input = document.querySelector("#todo-input");
const form = document.querySelector("#todo-form");
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

// Group todos by due date for smart display
function getTodoDueDateGroup(todo) {
  if (!todo.dueDate) return "noDueDate";
  const today = formatDateISO(new Date());
  const tomorrow = formatDateISO(new Date(Date.now() + 86400000));
  const week = formatDateISO(new Date(Date.now() + 7 * 86400000));
  
  if (todo.dueDate < today) return "overdue";
  if (todo.dueDate === today) return "today";
  if (todo.dueDate === tomorrow) return "tomorrow";
  if (todo.dueDate <= week) return "thisWeek";
  return "later";
}

const todoGroupOrder = ["overdue", "today", "tomorrow", "thisWeek", "later", "noDueDate"];
const todoGroupLabels = {
  overdue: "🔴 Overdue",
  today: "⭐ Today",
  tomorrow: "📅 Tomorrow",
  thisWeek: "📆 This Week",
  later: "🗓️ Later",
  noDueDate: "📌 No Due Date"
};

function render() {
  const filteredTodos = visibleTodos();
  
  // Group todos by due date
  const grouped = {};
  todoGroupOrder.forEach(group => {
    grouped[group] = [];
  });
  
  filteredTodos.forEach((todo) => {
    const group = getTodoDueDateGroup(todo);
    if (grouped[group]) {
      grouped[group].push(todo);
    }
  });
  
  // Render HTML for all groups
  let html = "";
  
  todoGroupOrder.forEach((groupKey) => {
    const groupTodos = grouped[groupKey];
    const groupLabel = todoGroupLabels[groupKey];
    
    if (groupTodos.length === 0) return; // Skip empty groups
    
    html += renderGroupHeader(groupLabel, groupTodos.length, `todo-${groupKey}`);
    
    const itemsHtml = groupTodos.map((todo) => {
      if (todo.id === editingId) {
        // Render placeholder for edit form
        return `<li class="todo-item" data-id="${todo.id}"></li>`;
      }
      
      const dueLabel = getDueDateLabel(todo);
      const dueBadgeClass = todo.dueDate < formatDateISO(new Date()) ? " is-overdue" : 
                            todo.dueDate === formatDateISO(new Date()) ? " is-due-today" : " is-upcoming";
      
      return `<li class="todo-item${todo.completed ? " is-completed" : ""}" data-id="${todo.id}">
        <input class="todo-check" type="checkbox" ${todo.completed ? "checked" : ""} aria-label="Mark ${esc(todo.text)} as ${todo.completed ? "active" : "completed"}">
        <div class="todo-details">
          <span class="todo-text">${esc(todo.text)}</span>
          <span class="todo-meta">
            <span class="todo-badge">${capitalize(todo.category)}</span>
            <span class="todo-badge priority-indicator priority-${todo.priority}">${capitalize(todo.priority)} priority</span>
            ${dueLabel ? `<span class="todo-badge${dueBadgeClass}">${esc(dueLabel)}</span>` : ""}
          </span>
        </div>
        <span class="todo-actions">
          <button class="move-button" type="button" data-action="move-up" aria-label="Move ${esc(todo.text)} up">&#9650;</button>
          <button class="move-button" type="button" data-action="move-down" aria-label="Move ${esc(todo.text)} down">&#9660;</button>
          <button class="edit-button" type="button" data-action="edit" aria-label="Edit ${esc(todo.text)}">Edit</button>
          <button class="delete-button" type="button" data-action="delete" aria-label="Delete ${esc(todo.text)}">&#10005;</button>
        </span>
      </li>`;
    }).join("");
    
    html += renderGroupContent(groupTodos, () => "", `todo-${groupKey}`, "");
    // Actually, we need to insert the HTML differently
  });
  
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
    emptyState.classList.remove("is-hidden");
    list.innerHTML = "";
    totalCount.textContent = todos.length;
    activeCount.textContent = todos.filter((todo) => !todo.completed).length;
    clearCompleted.disabled = !todos.some((todo) => todo.completed);
    return;
  }
  
  emptyState.classList.add("is-hidden");
  
  // Build HTML with groups
  let groupHTML = "";
  
  todoGroupOrder.forEach((groupKey) => {
    const groupTodos = grouped[groupKey];
    if (groupTodos.length === 0) return;
    
    const groupLabel = todoGroupLabels[groupKey];
    const isCollapsed = isGroupCollapsed(`todo-${groupKey}`);
    
    groupHTML += renderGroupHeader(groupLabel, groupTodos.length, `todo-${groupKey}`);
    
    const itemsHtml = groupTodos.map((todo) => {
      if (todo.id === editingId) {
        // Render placeholder for edit form
        return `<li class="todo-item" data-id="${todo.id}"></li>`;
      }
      
      const dueLabel = getDueDateLabel(todo);
      const dueBadgeClass = todo.dueDate < formatDateISO(new Date()) ? " is-overdue" : 
                            todo.dueDate === formatDateISO(new Date()) ? " is-due-today" : " is-upcoming";
      
      return `<li class="todo-item${todo.completed ? " is-completed" : ""}" data-id="${todo.id}">
        <input class="todo-check" type="checkbox" ${todo.completed ? "checked" : ""} aria-label="Mark ${esc(todo.text)} as ${todo.completed ? "active" : "completed"}">
        <div class="todo-details">
          <span class="todo-text">${esc(todo.text)}</span>
          <span class="todo-meta">
            <span class="todo-badge">${capitalize(todo.category)}</span>
            <span class="todo-badge priority-indicator priority-${todo.priority}">${capitalize(todo.priority)} priority</span>
            ${dueLabel ? `<span class="todo-badge${dueBadgeClass}">${esc(dueLabel)}</span>` : ""}
          </span>
        </div>
        <span class="todo-actions">
          <button class="move-button" type="button" data-action="move-up" aria-label="Move ${esc(todo.text)} up">&#9650;</button>
          <button class="move-button" type="button" data-action="move-down" aria-label="Move ${esc(todo.text)} down">&#9660;</button>
          <button class="edit-button" type="button" data-action="edit" aria-label="Edit ${esc(todo.text)}">Edit</button>
          <button class="delete-button" type="button" data-action="delete" aria-label="Delete ${esc(todo.text)}">&#10005;</button>
        </span>
      </li>`;
    }).join("");
    
    const groupContentClass = isCollapsed ? " is-collapsed" : "";
    groupHTML += `<div class="group-content${groupContentClass}" data-group-id="todo-${groupKey}">
      ${itemsHtml}
    </div>`;
  });
  
  list.innerHTML = groupHTML;
  
  // If a todo is being edited, render the edit form for it
  if (editingId) {
    const editItem = list.querySelector(`[data-id="${editingId}"]`);
    const editingTodo = todos.find((todo) => todo.id === editingId);
    if (editItem && editingTodo) {
      renderEditForm(editItem, editingTodo);
    }
  }
  
  totalCount.textContent = todos.length;
  activeCount.textContent = todos.filter((todo) => !todo.completed).length;
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

// Swipe-to-delete for todo items
list.addEventListener("touchstart", (e) => {
  handleSwipeStart(e, ".todo-list", ".todo-item");
}, { passive: true });

list.addEventListener("touchmove", (e) => {
  handleSwipeMove(e, ".todo-list", ".todo-item");
}, { passive: true });

list.addEventListener("touchend", (e) => {
  handleSwipeEnd(e, ".todo-list", ".todo-item", (item) => {
    const todoId = item.dataset.id;
    todos = todos.filter((todo) => todo.id !== todoId);
    saveTodos();
    item.classList.add("is-deleting");
    setTimeout(() => render(), 300);
    showToast("Todo deleted", "info", 2000);
  });
}, { passive: true });

function showStatus(message, type) {
  if (!statusMessage) return;
  statusMessage.textContent = message;
  statusMessage.className = `status-message${type ? ` is-${type}` : ""}`;
  if (message) {
    statusMessage.classList.remove("is-hidden");
  } else {
    statusMessage.classList.add("is-hidden");
  }
  // Also show as toast
  if (message) {
    showToast(message, type || "info", 3000);
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
  passwords: { panel: "view-passwords", init: initPasswords },
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
      ${items.length ? (() => {
        // Group items by category
        const grouped = {};
        SHOP_CATS.forEach(cat => {
          grouped[cat] = [];
        });
        items.forEach(it => {
          const cat = it.category || "Other";
          if (grouped[cat]) {
            grouped[cat].push(it);
          }
        });
        
        let html = "";
        SHOP_CATS.forEach(cat => {
          const catItems = grouped[cat];
          if (catItems.length === 0) return;
          
          const groupId = `shop-${list.id}-${cat}`;
          const isCollapsed = isGroupCollapsed(groupId);
          
          html += `<div class="group-header ${isCollapsed ? "is-collapsed" : ""}" data-group-id="${groupId}" data-toggle="group-header">
            ${esc(cat)} <span class="group-badge">${catItems.length}</span>
          </div>`;
          
          const itemsHtml = catItems.map((it) => `
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
            </li>`).join("");
          
          html += `<div class="group-content ${isCollapsed ? "is-collapsed" : ""}" data-group-id="${groupId}">
            ${itemsHtml}
          </div>`;
        });
        
        return html;
      })() : '<li class="empty">No items yet.</li>'}
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
  
  // Swipe-to-delete for shopping items
  root.addEventListener("touchstart", (e) => {
    handleSwipeStart(e, ".item-list", ".item");
  }, { passive: true });
  
  root.addEventListener("touchmove", (e) => {
    handleSwipeMove(e, ".item-list", ".item");
  }, { passive: true });
  
  root.addEventListener("touchend", (e) => {
    handleSwipeEnd(e, ".item-list", ".item", (item) => {
      const list = shopActive();
      const itemId = item.dataset.id;
      list.items = list.items.filter((i) => i.id !== itemId);
      shopSave();
      item.classList.add("is-deleting");
      setTimeout(() => renderShopping(), 300);
      showToast("Item deleted", "info", 2000);
    });
  }, { passive: true });
  
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
      ${filtered.length ? (() => {
        // Group links by category
        const grouped = {};
        LINK_CATS.forEach(cat => {
          grouped[cat] = [];
        });
        filtered.forEach(l => {
          const cat = l.category || "Other";
          if (grouped[cat]) {
            grouped[cat].push(l);
          }
        });
        
        let html = "";
        LINK_CATS.forEach(cat => {
          const catLinks = grouped[cat];
          if (catLinks.length === 0) return;
          
          const groupId = `links-${cat}`;
          const isCollapsed = isGroupCollapsed(groupId);
          
          html += `<div class="group-header ${isCollapsed ? "is-collapsed" : ""}" data-group-id="${groupId}" data-toggle="group-header">
            ${esc(cat)} <span class="group-badge">${catLinks.length}</span>
          </div>`;
          
          const itemsHtml = catLinks.map((l) => `
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
            </li>`).join("");
          
          html += `<div class="group-content ${isCollapsed ? "is-collapsed" : ""}" data-group-id="${groupId}">
            ${itemsHtml}
          </div>`;
        });
        
        return html;
      })() : '<li class="empty">No links yet.</li>'}
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
  
  // Swipe-to-delete for links
  root.addEventListener("touchstart", (e) => {
    handleSwipeStart(e, ".item-list", ".item");
  }, { passive: true });
  
  root.addEventListener("touchmove", (e) => {
    handleSwipeMove(e, ".item-list", ".item");
  }, { passive: true });
  
  root.addEventListener("touchend", (e) => {
    handleSwipeEnd(e, ".item-list", ".item", (item) => {
      const linkId = item.dataset.id;
      links.data = links.data.filter((x) => x.id !== linkId);
      linksSave();
      item.classList.add("is-deleting");
      setTimeout(() => renderLinks(), 300);
      showToast("Link deleted", "info", 2000);
    });
  }, { passive: true });
  
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
      ${filtered.length ? (() => {
        // Separate pinned and unpinned notes
        const pinned = filtered.filter(n => n.favorite);
        const unpinned = filtered.filter(n => !n.favorite);
        
        // Group unpinned by month
        const byMonth = {};
        unpinned.forEach(n => {
          const date = n.updated ? new Date(n.updated) : new Date();
          const monthKey = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
          if (!byMonth[monthKey]) byMonth[monthKey] = [];
          byMonth[monthKey].push(n);
        });
        
        let html = "";
        
        // Render pinned notes group
        if (pinned.length > 0) {
          const groupId = "notes-pinned";
          html += `<div class="group-header" data-group-id="${groupId}">
            📌 Pinned <span class="group-badge">${pinned.length}</span>
          </div>`;
          html += `<div class="group-content" data-group-id="${groupId}">
            ${pinned.map((n) => `
              <li class="item note" style="${noteStyle(n)}">
                <div class="item-main">
                  <span class="item-name">📌 ${esc(n.title)}</span>
                  <span class="muted">${esc((n.text || "").slice(0, 80))}</span>
                  ${(n.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}
                  <span class="muted tiny">${n.updated ? new Date(n.updated).toLocaleDateString() : ""}</span>
                </div>
                <span class="row-actions">
                  <button class="ghost" data-act="fav" data-id="${n.id}">Unpin</button>
                  <button class="ghost" data-act="edit" data-id="${n.id}">Edit</button>
                  <button class="ghost danger" data-act="del" data-id="${n.id}">Del</button>
                </span>
              </li>`).join("")}
          </div>`;
        }
        
        // Render month groups
        const monthOrder = Object.keys(byMonth).sort((a, b) => new Date(b) - new Date(a));
        monthOrder.forEach(monthKey => {
          const monthNotes = byMonth[monthKey];
          const groupId = `notes-${monthKey}`;
          const isCollapsed = isGroupCollapsed(groupId);
          
          html += `<div class="group-header ${isCollapsed ? "is-collapsed" : ""}" data-group-id="${groupId}" data-toggle="group-header">
            ${monthKey} <span class="group-badge">${monthNotes.length}</span>
          </div>`;
          html += `<div class="group-content ${isCollapsed ? "is-collapsed" : ""}" data-group-id="${groupId}">
            ${monthNotes.map((n) => `
              <li class="item note" style="${noteStyle(n)}">
                <div class="item-main">
                  <span class="item-name">${esc(n.title)}</span>
                  <span class="muted">${esc((n.text || "").slice(0, 80))}</span>
                  ${(n.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}
                  <span class="muted tiny">${n.updated ? new Date(n.updated).toLocaleDateString() : ""}</span>
                </div>
                <span class="row-actions">
                  <button class="ghost" data-act="fav" data-id="${n.id}">Pin</button>
                  <button class="ghost" data-act="edit" data-id="${n.id}">Edit</button>
                  <button class="ghost danger" data-act="del" data-id="${n.id}">Del</button>
                </span>
              </li>`).join("")}
          </div>`;
        });
        
        return html;
      })() : '<li class="empty">No notes yet.</li>'}
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
  
  // Swipe-to-delete for notes
  root.addEventListener("touchstart", (e) => {
    handleSwipeStart(e, ".item-list", ".item");
  }, { passive: true });
  
  root.addEventListener("touchmove", (e) => {
    handleSwipeMove(e, ".item-list", ".item");
  }, { passive: true });
  
  root.addEventListener("touchend", (e) => {
    handleSwipeEnd(e, ".item-list", ".item", (item) => {
      const noteId = item.dataset.id;
      notes.data = notes.data.filter((x) => x.id !== noteId);
      notesSave();
      item.classList.add("is-deleting");
      setTimeout(() => renderNotes(), 300);
      showToast("Note deleted", "info", 2000);
    });
  }, { passive: true });
  
  renderNotes();
}

const PASSWORDS_KEY = "myHandyHub.passwords";
const passwords = { inited: false, data: null, q: "", editingId: null, unlocked: false, masterPassword: null };

function passwordsLoad() { if (!passwords.data) passwords.data = storeGet(PASSWORDS_KEY, []); return passwords.data; }

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptVault(password, data) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(data)));
  const buf = new Uint8Array(salt.byteLength + iv.byteLength + ciphertext.byteLength);
  buf.set(salt, 0);
  buf.set(iv, salt.byteLength);
  buf.set(new Uint8Array(ciphertext), salt.byteLength + iv.byteLength);
  return btoa(String.fromCharCode(...buf));
}

async function decryptVault(password, base64) {
  try {
    const raw = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const salt = raw.slice(0, 16);
    const iv = raw.slice(16, 28);
    const ciphertext = raw.slice(28);
    const key = await deriveKey(password, salt);
    const dec = new TextDecoder();
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return JSON.parse(dec.decode(plaintext));
  } catch (e) {
    return null;
  }
}

async function unlockVault(password) {
  const stored = localStorage.getItem("myHandyHub.passwords.encrypted");
  if (!stored) return { ok: false, needsSetup: true };
  const data = await decryptVault(password, stored);
  if (!data) return { ok: false, needsSetup: false };
  passwords.data = data;
  passwords.unlocked = true;
  return { ok: true, needsSetup: false };
}

async function setupVault(password) {
  const data = [];
  passwords.data = data;
  passwords.unlocked = true;
  await saveEncryptedVault(password, data);
}

async function saveEncryptedVault(password, data) {
  const encrypted = await encryptVault(password, data);
  localStorage.setItem("myHandyHub.passwords.encrypted", encrypted);
}

function generatePassword(length = 16, options = { upper: true, lower: true, numbers: true, symbols: true }) {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  let chars = "";
  if (options.upper) chars += upper;
  if (options.lower) chars += lower;
  if (options.numbers) chars += numbers;
  if (options.symbols) chars += symbols;
  if (!chars) chars = lower;
  let password = "";
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length];
  }
  return password;
}

function passwordStrength(password) {
  let score = 0;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return "weak";
  if (score <= 4) return "medium";
  return "strong";
}

function renderPasswords() {
  const root = document.getElementById("passwords-app");
  if (!passwords.unlocked) {
    const hasVault = !!localStorage.getItem("myHandyHub.passwords.encrypted");
    root.innerHTML = `
      <div id="vault-lock" class="vault-lock">
        <form id="vault-unlock-form" class="dialog-form" ${hasVault ? "" : "hidden"}>
          <input id="vault-master" type="password" placeholder="Master password" required autocomplete="current-password">
          <button type="submit" class="add-button">Unlock</button>
        </form>
        <form id="vault-setup-form" class="dialog-form" ${hasVault ? "hidden" : ""}>
          <input id="vault-new-master" type="password" placeholder="New master password" required minlength="6" autocomplete="new-password">
          <input id="vault-confirm" type="password" placeholder="Confirm" required minlength="6" autocomplete="new-password">
          <button type="submit" class="add-button">Create vault</button>
        </form>
        <button class="ghost" id="vault-reset" type="button" ${hasVault ? "" : "hidden"}>Create new vault</button>
        <p id="vault-error" class="muted" style="color:var(--priority-high)"></p>
      </div>
    `;
    return;
  }

  passwordsLoad();
  const q = passwords.q.toLowerCase();
  const filtered = passwords.data.filter((p) => {
    if (q && !(`${p.site} ${p.username} ${p.password}`.toLowerCase().includes(q))) return false;
    return true;
  }).sort((a, b) => (b.favorite - a.favorite) || a.site.localeCompare(b.site));

  const editing = passwords.editingId ? filtered.find((p) => p.id === passwords.editingId) : null;

  root.innerHTML = `
    <div class="password-generator">
      <div class="password-display">
        <input type="text" id="generated-password" readonly value="${esc(editing ? editing.password : generatePassword(16))}" aria-label="Generated password">
        <button class="ghost" type="button" data-act="copy-password" data-id="generated">Copy</button>
        <button class="ghost" type="button" data-act="regenerate">↻</button>
      </div>
      <div class="password-strength">
        <div class="password-strength-bar strength-${passwordStrength(editing ? editing.password : generatePassword(16))}" id="strength-bar"></div>
      </div>
      <label>Length <input type="range" id="pwd-length" min="12" max="36" value="16"><output id="pwd-length-output">16</output></label>
      <label><input type="checkbox" id="pwd-upper" checked> A-Z</label>
      <label><input type="checkbox" id="pwd-lower" checked> a-z</label>
      <label><input type="checkbox" id="pwd-numbers" checked> 0-9</label>
      <label><input type="checkbox" id="pwd-symbols" checked> !@#</label>
    </div>
    <form id="password-form" class="item-form">
      <input name="site" placeholder="Site / App" value="${editing ? esc(editing.site) : ""}" required>
      <input name="username" placeholder="Username / Email" value="${editing ? esc(editing.username) : ""}" required>
      <input name="password" type="password" placeholder="Password (min 12 chars)" value="${editing ? esc(editing.password) : ""}" required minlength="12" maxlength="36">
      <input name="notes" placeholder="Notes (optional)" value="${editing ? esc(editing.notes || "") : ""}">
      <button type="submit" class="add-button">${editing ? "Save" : "Add"}</button>
      ${editing ? '<button type="button" class="ghost" data-act="cancel-edit">Cancel</button>' : ""}
    </form>
    <div class="app-bar">
      <input id="password-search" placeholder="Search…" value="${esc(passwords.q)}">
      <button class="ghost" id="vault-lock-btn" type="button">🔒 Lock</button>
    </div>
    <ul class="item-list">
      ${filtered.length ? filtered.map((p) => `
        <li class="item vault-item ${p.compromised ? "is-compromised" : ""}" data-id="${p.id}">
          <div class="vault-main">
            <span class="item-name">${p.favorite ? "⭐ " : ""}${esc(p.site)}</span>
            <span class="vault-meta">${esc(p.username)}</span>
            <span class="vault-password">••••••••</span>
            ${p.notes ? `<span class="muted">${esc(p.notes)}</span>` : ""}
          </div>
          <span class="row-actions">
            <button class="ghost" data-act="toggle-visibility" data-id="${p.id}">Show</button>
            <button class="ghost" data-act="copy-password" data-id="${p.id}">Copy</button>
            <button class="ghost" data-act="fav" data-id="${p.id}">${p.favorite ? "Unfav" : "Fav"}</button>
            <button class="ghost" data-act="edit" data-id="${p.id}">Edit</button>
            <button class="ghost danger" data-act="del" data-id="${p.id}">Del</button>
          </span>
        </li>`).join("") : '<li class="empty">No passwords yet. Generate or add one above.</li>'}
    </ul>
  `;

  const passwordsCount = document.getElementById("passwords-count");
  if (passwordsCount) passwordsCount.textContent = passwords.data.length;
}

function initPasswords() {
  passwordsLoad();
  if (passwords.inited) { renderPasswords(); return; }
  passwords.inited = true;
  const root = document.getElementById("passwords-app");

  async function handleUnlock(e) {
    e.preventDefault();
    const input = document.getElementById("vault-master");
    const error = document.getElementById("vault-error");
    if (!input) return;
    const password = input.value;
    if (!password) return;
    const result = await unlockVault(password);
    if (result.ok) {
      passwords.masterPassword = password;
      renderPasswords();
    } else {
      if (error) error.textContent = "Wrong password";
      input.value = "";
    }
  }

  async function handleSetup(e) {
    e.preventDefault();
    const master = document.getElementById("vault-new-master");
    const confirmInput = document.getElementById("vault-confirm");
    const error = document.getElementById("vault-error");
    if (!master || !confirmInput) return;
    if (master.value !== confirmInput.value) {
      if (error) error.textContent = "Passwords do not match";
      return;
    }
    if (master.value.length < 6) {
      if (error) error.textContent = "Password must be at least 6 characters";
      return;
    }

    const hasVault = !!localStorage.getItem("myHandyHub.passwords.encrypted");
    if (hasVault) {
      const confirmDialog = document.getElementById("confirm-dialog");
      const confirmMessage = document.getElementById("confirm-dialog-message");
      const confirmOk = document.getElementById("confirm-dialog-ok");
      if (confirmDialog && confirmMessage && confirmOk) {
        confirmMessage.textContent = "This will delete all saved passwords and create a new vault. Continue?";
        confirmOk.textContent = "Reset vault";
        const doReset = await new Promise((resolve) => {
          confirmOk.onclick = () => { resolve(true); };
          confirmDialog.classList.add("is-visible");
          confirmDialog.setAttribute("aria-hidden", "false");
        });
        confirmDialog.classList.remove("is-visible");
        confirmDialog.setAttribute("aria-hidden", "true");
        confirmOk.textContent = "Delete";
        if (!doReset) return;
      }
    }

    await setupVault(master.value);
    passwords.masterPassword = master.value;
    renderPasswords();
  }

  root.addEventListener("submit", async (e) => {
    if (e.target.id === "vault-unlock-form") { handleUnlock(e); return; }
    if (e.target.id === "vault-setup-form") { handleSetup(e); return; }
    if (e.target.id !== "password-form") return;
    e.preventDefault();
    const f = e.target;
    const password = f.password.value.trim();
    if (password.length < 12) { alert("Password must be at least 12 characters"); return; }
    if (passwords.editingId) {
      const item = passwords.data.find((x) => x.id === passwords.editingId);
      if (item) {
        item.site = f.site.value.trim();
        item.username = f.username.value.trim();
        item.password = password;
        item.notes = f.notes.value.trim();
      }
      passwords.editingId = null;
    } else {
      passwords.data.push({ id: uid(), site: f.site.value.trim(), username: f.username.value.trim(), password, notes: f.notes.value.trim(), favorite: false, compromised: false, created: new Date().toISOString(), updated: new Date().toISOString() });
    }
    await saveEncryptedVault(passwords.masterPassword, passwords.data);
    renderPasswords();
  });

  root.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    const p = passwords.data.find((x) => x.id === btn.dataset.id);
    if (!p && btn.dataset.id !== "generated" && act !== "regenerate") return;

    if (act === "regenerate") {
      const length = document.getElementById("pwd-length")?.value || 16;
      const upper = document.getElementById("pwd-upper")?.checked ?? true;
      const lower = document.getElementById("pwd-lower")?.checked ?? true;
      const numbers = document.getElementById("pwd-numbers")?.checked ?? true;
      const symbols = document.getElementById("pwd-symbols")?.checked ?? true;
      const newPwd = generatePassword(Number(length), { upper, lower, numbers, symbols });
      const input = document.getElementById("generated-password");
      if (input) input.value = newPwd;
      const bar = document.getElementById("strength-bar");
      if (bar) { bar.className = `password-strength-bar strength-${passwordStrength(newPwd)}`; }
    }
    else if (act === "copy-password") {
      const text = btn.dataset.id === "generated" ? document.getElementById("generated-password")?.value : p.password;
      if (text) {
        try { await navigator.clipboard.writeText(text); btn.textContent = "Copied"; setTimeout(() => { if (btn.dataset.id === "generated") { btn.textContent = "Copy"; const pwdInput = document.querySelector('#password-form input[name="password"]'); if (pwdInput) pwdInput.value = text; } else renderPasswords(); }, 800); } catch (err) { alert(text); }
      }
    }
    else if (act === "toggle-visibility" && p) {
      const item = btn.closest(".vault-item");
      const pwdSpan = item?.querySelector(".vault-password");
      if (pwdSpan) {
        const isHidden = pwdSpan.textContent === "••••••••";
        pwdSpan.textContent = isHidden ? p.password : "••••••••";
        btn.textContent = isHidden ? "Hide" : "Show";
      }
    }
    else if (act === "fav") { p.favorite = !p.favorite; await saveEncryptedVault(passwords.masterPassword, passwords.data); renderPasswords(); }
    else if (act === "del") { passwords.data = passwords.data.filter((x) => x.id !== p.id); await saveEncryptedVault(passwords.masterPassword, passwords.data); renderPasswords(); }
    else if (act === "edit") {
      passwords.editingId = p.id;
      renderPasswords();
    }
    else if (act === "cancel-edit") {
      passwords.editingId = null;
      renderPasswords();
    }
  });

  const lockBtn = document.getElementById("vault-lock-btn");
  if (lockBtn) {
    lockBtn.addEventListener("click", () => {
      passwords.unlocked = false;
      passwords.masterPassword = null;
      passwords.data = [];
      renderPasswords();
    });
  }

  root.addEventListener("input", (e) => {
    if (e.target.id === "password-search") { passwords.q = e.target.value; renderPasswords(); }
    else if (e.target.id === "pwd-length") {
      const output = document.getElementById("pwd-length-output");
      if (output) output.value = e.target.value;
      const btn = root.querySelector('[data-act="regenerate"]');
      if (btn) btn.click();
    }
  });

  root.addEventListener("change", (e) => {
    if (e.target.id === "pwd-upper" || e.target.id === "pwd-lower" || e.target.id === "pwd-numbers" || e.target.id === "pwd-symbols") {
      const btn = root.querySelector('[data-act="regenerate"]');
      if (btn) btn.click();
    }
  });

  renderPasswords();
}

// Register the service worker only when the browser supports offline caching.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  });
}
