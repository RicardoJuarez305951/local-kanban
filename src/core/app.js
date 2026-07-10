(function registerApplication(namespace) {
const { installGlobalErrorHandlers, toUserMessage, createStore } = namespace.core;
const {
  ValidationError,
  createDefaultColumns,
  createProject,
  createTask,
  taskWithColumn,
  updateTask,
} = namespace.domain;
const {
  createProjectFilePayload,
  getProjectFileName,
  parseProjectFilePayload,
  planTaskMove,
} = namespace.persistence;
const {
  bindShell,
  downloadJson,
  focusProjectField,
  focusTaskField,
  renderBoard,
  renderFeedback,
  renderProjects,
  renderTaskEditor,
  renderViewState,
  resetProjectForm,
  setInteractionState,
} = namespace.ui;

function cloneGraph(graph) {
  return {
    project: { ...graph.project },
    columns: graph.columns.map((column) => ({ ...column })),
    tasks: graph.tasks.map((task) => ({ ...task, labels: [...(task.labels ?? [])] })),
    fileName: graph.fileName,
    dirty: Boolean(graph.dirty),
  };
}

function sortProjects(projects) {
  return [...projects].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function stateFromGraphs(graphs, activeProjectId = null, extra = {}) {
  const sortedGraphs = [...graphs].sort((left, right) =>
    right.project.updatedAt.localeCompare(left.project.updatedAt),
  );
  const activeGraph =
    sortedGraphs.find((graph) => graph.project.id === activeProjectId) ?? sortedGraphs[0] ?? null;

  return {
    graphs: sortedGraphs,
    projects: sortProjects(sortedGraphs.map((graph) => graph.project)),
    activeProject: activeGraph?.project ?? null,
    columns: activeGraph?.columns ?? [],
    tasks: activeGraph?.tasks ?? [],
    dirtyProjectIds: sortedGraphs
      .filter((graph) => graph.dirty)
      .map((graph) => graph.project.id),
    ...extra,
  };
}

function replaceGraph(graphs, nextGraph) {
  const nextGraphs = graphs.map((graph) =>
    graph.project.id === nextGraph.project.id ? nextGraph : graph,
  );
  if (nextGraphs.some((graph) => graph.project.id === nextGraph.project.id)) {
    return nextGraphs;
  }
  return [...nextGraphs, nextGraph];
}

function activeGraphFromState(state) {
  if (!state.activeProject) {
    throw new Error("No hay un proyecto activo.");
  }
  const graph = state.graphs.find((candidate) => candidate.project.id === state.activeProject.id);
  if (!graph) {
    throw new Error("El proyecto activo no esta cargado.");
  }
  return cloneGraph(graph);
}

function withProjectTimestamp(graph) {
  const timestamp = new Date().toISOString();
  return {
    ...graph,
    project: { ...graph.project, updatedAt: timestamp },
    dirty: true,
  };
}

function ensureUniqueProjectIds(graphs) {
  const ids = new Set();
  graphs.forEach((graph) => {
    if (ids.has(graph.project.id)) {
      throw new Error(`Hay mas de un JSON con el proyecto ${graph.project.id}.`);
    }
    ids.add(graph.project.id);
  });
}

function confirmDiscardChanges(store) {
  const state = store.getState();
  if (!state.dirtyProjectIds?.length) return true;
  return globalThis.confirm("Hay cambios sin guardar. Si cargas otros JSON se perderan.");
}

async function readProjectFiles(files) {
  const graphs = await Promise.all(
    Array.from(files).map(async (file) => {
      const payload = JSON.parse(await file.text());
      return parseProjectFilePayload(payload, file.name);
    }),
  );
  ensureUniqueProjectIds(graphs);
  return graphs;
}

function downloadGraph(graph) {
  downloadJson(createProjectFilePayload(graph), getProjectFileName(graph));
}

async function bootstrapApplication(shell) {
  const store = createStore({
    graphs: [],
    projects: [],
    activeProject: null,
    columns: [],
    tasks: [],
    dirtyProjectIds: [],
    taskEditor: { open: false, taskId: null, columnId: null },
    loading: false,
    error: null,
  });

  const reportError = (error) => {
    console.error(error);
    store.setState({ error: toUserMessage(error), loading: false });
  };

  installGlobalErrorHandlers(reportError);
  globalThis.addEventListener("beforeunload", (event) => {
    if (!store.getState().dirtyProjectIds?.length) return;
    event.preventDefault();
    event.returnValue = "";
  });

  store.subscribe((state) => {
    renderProjects(shell, state.projects, state.activeProject, state.dirtyProjectIds);
    renderBoard(shell, state.activeProject, state.columns, state.tasks);
    renderTaskEditor(shell, state.taskEditor, state.tasks);
    renderFeedback(shell, state.error, state.dirtyProjectIds);
    renderViewState(shell, state);
    setInteractionState(shell, state.loading);
  });

  bindShell(shell, {
    async onCreateProject(input) {
      store.setState({ loading: true, error: null });
      try {
        const project = createProject(input);
        const graph = {
          project,
          columns: createDefaultColumns(project.id),
          tasks: [],
          fileName: `${namespace.persistence.slugifyProjectName(project.name)}.json`,
          dirty: true,
        };
        const nextGraphs = replaceGraph(store.getState().graphs, graph);
        store.setState(
          stateFromGraphs(nextGraphs, project.id, {
            taskEditor: { open: false, taskId: null, columnId: null },
            loading: false,
          }),
        );
        resetProjectForm(shell);
      } catch (error) {
        reportError(error);
        if (error instanceof ValidationError) {
          focusProjectField(shell, error.field);
        }
      }
    },

    async onSelectProject(projectId) {
      store.setState({
        ...stateFromGraphs(store.getState().graphs, projectId, {
          taskEditor: { open: false, taskId: null, columnId: null },
          error: null,
        }),
      });
    },

    onOpenNewTask(columnId) {
      store.setState({
        taskEditor: { open: true, taskId: null, columnId },
        error: null,
      });
    },

    onOpenTask(taskId) {
      const task = store.getState().tasks.find((candidate) => candidate.id === taskId);
      if (!task) return;
      store.setState({
        taskEditor: { open: true, taskId, columnId: task.columnId },
        error: null,
      });
    },

    onCloseTaskEditor() {
      store.setState({ taskEditor: { open: false, taskId: null, columnId: null } });
    },

    async onSaveTask(input) {
      store.setState({ loading: true, error: null });
      try {
        const graph = activeGraphFromState(store.getState());
        const column = graph.columns.find((candidate) => candidate.id === input.columnId);
        if (!input.id && !column) {
          throw new Error("La columna seleccionada no pertenece al proyecto activo.");
        }
        if (input.id && !graph.tasks.some((task) => task.id === input.id)) {
          throw new Error("La tarea seleccionada no existe.");
        }

        const tasks = input.id
          ? graph.tasks.map((task) => (task.id === input.id ? updateTask(task, input) : task))
          : [
              ...graph.tasks,
              createTask(input, {
                projectId: graph.project.id,
                columnId: input.columnId,
                order: graph.tasks.filter((task) => task.columnId === input.columnId).length,
                completedAt: column?.type === "done" ? new Date().toISOString() : null,
              }),
            ];
        const nextGraph = withProjectTimestamp({ ...graph, tasks });
        const nextGraphs = replaceGraph(store.getState().graphs, nextGraph);
        store.setState(
          stateFromGraphs(nextGraphs, nextGraph.project.id, {
            taskEditor: { open: false, taskId: null, columnId: null },
            loading: false,
          }),
        );
      } catch (error) {
        reportError(error);
        if (error instanceof ValidationError) {
          focusTaskField(shell, error.field);
        }
      }
    },

    async onDeleteTask(taskId) {
      if (!taskId) return;
      store.setState({ loading: true, error: null });
      try {
        const graph = activeGraphFromState(store.getState());
        const deletedTask = graph.tasks.find((task) => task.id === taskId);
        if (!deletedTask) {
          throw new Error("La tarea seleccionada no existe.");
        }
        const remaining = graph.tasks
          .filter((task) => task.id !== taskId)
          .map((task) => ({ ...task }));
        const columnTasks = remaining
          .filter((task) => task.columnId === deletedTask.columnId)
          .sort((left, right) => left.order - right.order)
          .map((task, order) => ({ ...task, order }));
        const tasks = remaining.map(
          (task) => columnTasks.find((candidate) => candidate.id === task.id) ?? task,
        );
        const nextGraph = withProjectTimestamp({ ...graph, tasks });
        const nextGraphs = replaceGraph(store.getState().graphs, nextGraph);
        store.setState(
          stateFromGraphs(nextGraphs, nextGraph.project.id, {
            taskEditor: { open: false, taskId: null, columnId: null },
            loading: false,
          }),
        );
      } catch (error) {
        reportError(error);
      }
    },

    async onMoveTask({ taskId, targetColumnId, beforeTaskId }) {
      if (!taskId || taskId === beforeTaskId) return;
      store.setState({ loading: true, error: null });
      try {
        const graph = activeGraphFromState(store.getState());
        const targetColumn = graph.columns.find((column) => column.id === targetColumnId);
        const movedTasks = planTaskMove({
          projectId: graph.project.id,
          projectTasks: graph.tasks,
          taskId,
          targetColumn,
          beforeTaskId,
          now: () => new Date().toISOString(),
          taskWithColumn,
        });
        const movedById = new Map(movedTasks.map((task) => [task.id, task]));
        const tasks = graph.tasks.map((task) => movedById.get(task.id) ?? task);
        const nextGraph = withProjectTimestamp({ ...graph, tasks });
        const nextGraphs = replaceGraph(store.getState().graphs, nextGraph);
        store.setState(stateFromGraphs(nextGraphs, nextGraph.project.id, { loading: false }));
      } catch (error) {
        reportError(error);
      }
    },

    async onExportProject() {
      try {
        const graph = activeGraphFromState(store.getState());
        downloadGraph(graph);
        const cleanGraph = { ...graph, dirty: false };
        const nextGraphs = replaceGraph(store.getState().graphs, cleanGraph);
        store.setState(stateFromGraphs(nextGraphs, cleanGraph.project.id, { error: null }));
      } catch (error) {
        reportError(error);
      }
    },

    async onExportAll() {
      try {
        const state = store.getState();
        state.graphs.forEach(downloadGraph);
        const nextGraphs = state.graphs.map((graph) => ({ ...graph, dirty: false }));
        store.setState(
          stateFromGraphs(nextGraphs, state.activeProject?.id, {
            error: null,
          }),
        );
      } catch (error) {
        reportError(error);
      }
    },

    async onImportFiles(files) {
      if (!files.length || !confirmDiscardChanges(store)) return;
      store.setState({ loading: true, error: null });
      try {
        const graphs = await readProjectFiles(files);
        store.setState(
          stateFromGraphs(graphs, graphs[0]?.project.id, {
            taskEditor: { open: false, taskId: null, columnId: null },
            loading: false,
          }),
        );
      } catch (error) {
        reportError(error);
      }
    },
  });
}

namespace.core.bootstrapApplication = bootstrapApplication;
})(globalThis.LocalKanban);
