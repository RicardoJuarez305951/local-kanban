export function renderFeedback(shell, error) {
  shell.statusBanner.hidden = !error;
  shell.statusBanner.textContent = error ?? "";
  shell.statusBanner.dataset.type = error ? "error" : "";
}

export function renderViewState(shell, state) {
  shell.loadingView.hidden = !state.loading || Boolean(state.activeProject);
  shell.emptyView.hidden = state.loading || Boolean(state.activeProject);
  shell.workspaceView.hidden = !state.activeProject;
}
