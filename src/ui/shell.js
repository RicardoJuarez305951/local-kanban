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
}

function setInteractionState(shell, loading) {
  shell.app.setAttribute("aria-busy", String(loading));
  shell.createProjectButton.disabled = loading;
  shell.projectList.querySelectorAll("button").forEach((button) => {
    button.disabled = loading;
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
