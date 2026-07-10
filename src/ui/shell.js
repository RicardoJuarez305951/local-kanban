(function registerShell(namespace) {
function requiredElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`No se encontró el elemento #${id}.`);
  }
  return element;
}

function getShell() {
  return {
    app: requiredElement("app"),
    projectForm: requiredElement("project-form"),
    projectName: requiredElement("project-name"),
    createProjectButton: requiredElement("create-project-button"),
    projectList: requiredElement("project-list"),
    projectCount: requiredElement("project-count"),
    focusProjectForm: requiredElement("focus-project-form"),
    statusBanner: requiredElement("status-banner"),
    loadingView: requiredElement("loading-view"),
    emptyView: requiredElement("empty-view"),
    workspaceView: requiredElement("workspace-view"),
    activeProjectName: requiredElement("active-project-name"),
    activeProjectDescription: requiredElement("active-project-description"),
    projectMetadata: requiredElement("project-metadata"),
    board: requiredElement("board"),
    exportProjectButton: requiredElement("export-project-button"),
    exportAllButton: requiredElement("export-all-button"),
    importButton: requiredElement("import-button"),
    importFile: requiredElement("import-file"),
    taskEditor: requiredElement("task-editor"),
    taskForm: requiredElement("task-form"),
    taskId: requiredElement("task-id"),
    taskColumnId: requiredElement("task-column-id"),
    taskTitle: requiredElement("task-title"),
    taskDescription: requiredElement("task-description"),
    taskPriority: requiredElement("task-priority"),
    taskDueDate: requiredElement("task-due-date"),
    taskLabels: requiredElement("task-labels"),
    taskEditorTitle: requiredElement("task-editor-title"),
    closeTaskEditor: requiredElement("close-task-editor"),
    cancelTaskButton: requiredElement("cancel-task-button"),
    deleteTaskButton: requiredElement("delete-task-button"),
    saveTaskButton: requiredElement("save-task-button"),
  };
}

function bindShell(shell, handlers) {
  shell.projectForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(shell.projectForm);
    await handlers.onCreateProject(Object.fromEntries(formData.entries()));
  });

  shell.projectList.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-project-id]");
    if (!button || button.getAttribute("aria-pressed") === "true") {
      return;
    }
    await handlers.onSelectProject(button.dataset.projectId);
  });

  shell.focusProjectForm.addEventListener("click", () => shell.projectName.focus());

  shell.board.addEventListener("click", async (event) => {
    const addButton = event.target.closest("button[data-action='add-task']");
    if (addButton) {
      handlers.onOpenNewTask(addButton.dataset.columnId);
      return;
    }

    const card = event.target.closest("[data-task-id]");
    if (card) {
      handlers.onOpenTask(card.dataset.taskId);
    }
  });

  shell.board.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest("[data-task-id]");
    if (!card) return;
    event.preventDefault();
    handlers.onOpenTask(card.dataset.taskId);
  });

  shell.board.addEventListener("dragstart", (event) => {
    const card = event.target.closest("[data-task-id]");
    if (!card) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", card.dataset.taskId);
    card.classList.add("task-card--dragging");
  });

  shell.board.addEventListener("dragend", (event) => {
    event.target.closest("[data-task-id]")?.classList.remove("task-card--dragging");
    shell.board.querySelectorAll(".drop-target").forEach((target) => {
      target.classList.remove("drop-target");
    });
  });

  shell.board.addEventListener("dragover", (event) => {
    const column = event.target.closest("[data-column-id]");
    if (!column) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    shell.board.querySelectorAll(".drop-target").forEach((target) => {
      target.classList.remove("drop-target");
    });
    event.target.closest(".task-card, .column-body")?.classList.add("drop-target");
  });

  shell.board.addEventListener("drop", async (event) => {
    const column = event.target.closest("[data-column-id]");
    if (!column) return;
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain");
    const beforeCard = event.target.closest(".task-card");
    await handlers.onMoveTask({
      taskId,
      targetColumnId: column.dataset.columnId,
      beforeTaskId: beforeCard?.dataset.taskId ?? null,
    });
  });

  shell.taskForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(shell.taskForm);
    await handlers.onSaveTask(Object.fromEntries(formData.entries()));
  });

  shell.closeTaskEditor.addEventListener("click", handlers.onCloseTaskEditor);
  shell.cancelTaskButton.addEventListener("click", handlers.onCloseTaskEditor);
  shell.deleteTaskButton.addEventListener("click", async () => {
    if (globalThis.confirm("¿Eliminar esta tarea?")) {
      await handlers.onDeleteTask(shell.taskId.value);
    }
  });

  shell.exportProjectButton.addEventListener("click", handlers.onExportProject);
  shell.exportAllButton.addEventListener("click", handlers.onExportAll);
  shell.importButton.addEventListener("click", () => shell.importFile.click());
  shell.importFile.addEventListener("change", async () => {
    const files = Array.from(shell.importFile.files ?? []);
    if (!files.length) return;
    await handlers.onImportFiles(files);
    shell.importFile.value = "";
  });
}

function setInteractionState(shell, loading) {
  shell.app.setAttribute("aria-busy", String(loading));
  shell.createProjectButton.disabled = loading;
  shell.saveTaskButton.disabled = loading;
  shell.deleteTaskButton.disabled = loading;
  shell.exportProjectButton.disabled = loading;
  shell.exportAllButton.disabled = loading;
  shell.importButton.disabled = loading;
  shell.projectList.querySelectorAll("button").forEach((button) => {
    button.disabled = loading;
  });
  shell.board.querySelectorAll("button, .task-card").forEach((element) => {
    if ("disabled" in element) {
      element.disabled = loading;
    } else {
      element.draggable = !loading;
      element.setAttribute("aria-disabled", String(loading));
    }
  });
}

function resetProjectForm(shell) {
  shell.projectForm.reset();
  shell.projectName.focus();
}

function focusProjectField(shell, field) {
  shell.projectForm.elements.namedItem(field)?.focus();
}

Object.assign(namespace.ui, {
  getShell,
  bindShell,
  setInteractionState,
  resetProjectForm,
  focusProjectField,
});
})(globalThis.LocalKanban);
