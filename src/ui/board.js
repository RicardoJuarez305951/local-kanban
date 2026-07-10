(function registerBoardUi(namespace) {
function appendMetadata(container, label, value) {
  if (!value) return;

  const group = document.createElement("div");
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  term.textContent = label;
  description.textContent = value;
  group.append(term, description);
  container.append(group);
}

const PRIORITY_LABELS = Object.freeze({
  none: "Sin prioridad",
  low: "Baja",
  medium: "Media",
  high: "Alta",
});

function formatDueDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function createTaskCard(task) {
  const card = document.createElement("article");
  card.className = `task-card task-card--${task.priority}`;
  card.dataset.taskId = task.id;
  card.draggable = true;
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `Editar tarea ${task.title}`);

  const title = document.createElement("h4");
  title.textContent = task.title;
  card.append(title);

  if (task.description) {
    const description = document.createElement("p");
    description.className = "task-card__description";
    description.textContent = task.description;
    card.append(description);
  }

  const metaItems = [];
  if (task.priority && task.priority !== "none") {
    metaItems.push(PRIORITY_LABELS[task.priority] ?? task.priority);
  }
  if (task.dueDate) {
    metaItems.push(`Vence ${formatDueDate(task.dueDate)}`);
  }

  if (metaItems.length > 0) {
    const meta = document.createElement("p");
    meta.className = "task-card__meta";
    meta.textContent = metaItems.join(" · ");
    card.append(meta);
  }

  if (task.labels?.length) {
    const labels = document.createElement("div");
    labels.className = "task-labels";
    task.labels.forEach((label) => {
      const chip = document.createElement("span");
      chip.textContent = label;
      labels.append(chip);
    });
    card.append(labels);
  }

  return card;
}

function createColumn(column, tasks) {
  const section = document.createElement("section");
  section.className = `kanban-column kanban-column--${column.type}`;
  section.dataset.columnId = column.id;

  const header = document.createElement("header");
  const titleGroup = document.createElement("div");
  const title = document.createElement("h3");
  const count = document.createElement("span");
  const addButton = document.createElement("button");
  const columnTasks = tasks
    .filter((task) => task.columnId === column.id)
    .sort((left, right) => left.order - right.order);

  title.textContent = column.name;
  titleGroup.append(title);
  if (column.wipLimit !== null && column.wipLimit !== undefined) {
    const limit = document.createElement("small");
    limit.textContent = `Limite ${column.wipLimit}`;
    titleGroup.append(limit);
  }

  count.className = "column-count";
  count.textContent = String(columnTasks.length);
  count.setAttribute("aria-label", `${columnTasks.length} tareas`);

  addButton.type = "button";
  addButton.className = "icon-button column-add-button";
  addButton.dataset.action = "add-task";
  addButton.dataset.columnId = column.id;
  addButton.textContent = "+";
  addButton.title = `Agregar tarea en ${column.name}`;
  addButton.setAttribute("aria-label", `Agregar tarea en ${column.name}`);

  const actions = document.createElement("div");
  actions.className = "column-actions";
  actions.append(count, addButton);
  header.append(titleGroup, actions);

  const body = document.createElement("div");
  body.className = "column-body";
  body.dataset.columnId = column.id;

  if (columnTasks.length === 0) {
    const empty = document.createElement("p");
    empty.className = "column-empty";
    empty.textContent = "Sin tareas";
    body.append(empty);
  } else {
    columnTasks.forEach((task) => body.append(createTaskCard(task)));
  }

  section.append(header, body);
  return section;
}

function renderBoard(shell, activeProject, columns, tasks) {
  if (!activeProject) {
    shell.activeProjectName.textContent = "";
    shell.activeProjectDescription.textContent = "";
    shell.projectMetadata.replaceChildren();
    shell.board.replaceChildren();
    return;
  }

  shell.activeProjectName.textContent = activeProject.name;
  shell.activeProjectDescription.textContent = activeProject.description;
  shell.activeProjectDescription.hidden = !activeProject.description;

  const metadata = document.createDocumentFragment();
  appendMetadata(metadata, "Repositorio", activeProject.repository);
  appendMetadata(metadata, "Ruta local", activeProject.localPath);
  shell.projectMetadata.replaceChildren(metadata);
  shell.projectMetadata.hidden = !activeProject.repository && !activeProject.localPath;

  const columnsFragment = document.createDocumentFragment();
  columns.forEach((column) => columnsFragment.append(createColumn(column, tasks)));
  shell.board.replaceChildren(columnsFragment);
}

namespace.ui.renderBoard = renderBoard;
})(globalThis.LocalKanban);
