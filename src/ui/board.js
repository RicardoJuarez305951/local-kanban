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

function createColumn(column, tasks) {
  const section = document.createElement("section");
  section.className = `kanban-column kanban-column--${column.type}`;
  section.dataset.columnId = column.id;

  const header = document.createElement("header");
  const title = document.createElement("h3");
  const count = document.createElement("span");
  const columnTasks = tasks.filter((task) => task.columnId === column.id);

  title.textContent = column.name;
  count.className = "column-count";
  count.textContent = String(columnTasks.length);
  count.setAttribute("aria-label", `${columnTasks.length} tareas`);
  header.append(title, count);

  const body = document.createElement("div");
  body.className = "column-body";

  const empty = document.createElement("p");
  empty.className = "column-empty";
  empty.textContent = columnTasks.length === 0 ? "Sin tareas" : `${columnTasks.length} tareas`;
  body.append(empty);

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
