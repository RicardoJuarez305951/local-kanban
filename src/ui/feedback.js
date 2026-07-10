(function registerFeedbackUi(namespace) {
function renderFeedback(shell, error, dirtyProjectIds = []) {
  const hasDirtyProjects = dirtyProjectIds.length > 0;
  shell.statusBanner.hidden = !error && !hasDirtyProjects;
  shell.statusBanner.textContent =
    error ??
    (hasDirtyProjects
      ? "Hay cambios sin guardar. Usa Guardar proyecto o Guardar todos y reemplaza los JSON en my_projects."
      : "");
  shell.statusBanner.dataset.type = error ? "error" : hasDirtyProjects ? "warning" : "";
}

function renderViewState(shell, state) {
  shell.loadingView.hidden = !state.loading || Boolean(state.activeProject);
  shell.emptyView.hidden = state.loading || Boolean(state.activeProject);
  shell.workspaceView.hidden = !state.activeProject;
}

Object.assign(namespace.ui, { renderFeedback, renderViewState });
})(globalThis.LocalKanban);
