(function registerProjectModel(namespace) {
  const { createId, nowIso } = namespace.shared;
  const { normalizeProjectInput } = namespace.domain;

  function createProject(input, options = {}) {
    const normalized = normalizeProjectInput(input);
    const idFactory = options.idFactory ?? createId;
    const timestamp = (options.now ?? nowIso)();

    return {
      id: idFactory(),
      ...normalized,
      archived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  namespace.domain.createProject = createProject;
})(globalThis.LocalKanban);
