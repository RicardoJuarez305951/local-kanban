(function registerApplication(namespace) {
const { installGlobalErrorHandlers, toUserMessage, createStore } = namespace.core;
const { ProjectService, ValidationError } = namespace.domain;
const { openDatabase, createProjectUnitOfWork } = namespace.persistence;
const {
  createColumnRepository,
  createProjectRepository,
  createSettingsRepository,
  createTaskRepository,
} = namespace.persistence.repositories;
const { renderBoard, renderFeedback, renderViewState, renderProjects } = namespace.ui;
const {
  bindShell,
  focusProjectField,
  resetProjectForm,
  setInteractionState,
} = namespace.ui;

async function bootstrapApplication(shell) {
  const store = createStore();

  const reportError = (error) => {
    console.error(error);
    store.setState({ error: toUserMessage(error), loading: false });
  };

  installGlobalErrorHandlers(reportError);
  store.subscribe((state) => {
    renderProjects(shell, state.projects, state.activeProject);
    renderBoard(shell, state.activeProject, state.columns, state.tasks);
    renderFeedback(shell, state.error);
    renderViewState(shell, state);
    setInteractionState(shell, state.loading);
  });

  const database = await openDatabase({
    onBlocked: () =>
      store.setState({
        error: "Cierra otras pestañas de Kanban local para actualizar la base de datos.",
      }),
    onVersionChange: () =>
      store.setState({
        error: "Hay una versión nueva de la base local. Recarga esta pestaña.",
      }),
  });

  const projects = createProjectRepository(database);
  const service = new ProjectService({
    projects,
    columns: createColumnRepository(database),
    tasks: createTaskRepository(database),
    settings: createSettingsRepository(database),
    unitOfWork: createProjectUnitOfWork(database),
  });

  bindShell(shell, {
    async onCreateProject(input) {
      store.setState({ loading: true, error: null });
      try {
        const graph = await service.createProject(input);
        const projectList = await projects.list();
        store.setState({ ...graph, projects: projectList, loading: false });
        resetProjectForm(shell);
      } catch (error) {
        reportError(error);
        if (error instanceof ValidationError) {
          focusProjectField(shell, error.field);
        }
      }
    },

    async onSelectProject(projectId) {
      store.setState({ loading: true, error: null });
      try {
        const graph = await service.selectProject(projectId);
        store.setState({ ...graph, loading: false });
      } catch (error) {
        reportError(error);
      }
    },
  });

  try {
    const initialState = await service.initialize();
    store.setState({ ...initialState, loading: false, error: null });
  } catch (error) {
    reportError(error);
  }
}

namespace.core.bootstrapApplication = bootstrapApplication;
})(globalThis.LocalKanban);
