(function registerProjectService(namespace) {
const { createDefaultColumns, createProject } = namespace.domain;

class ProjectService {
  constructor({ projects, columns, tasks, settings, unitOfWork }) {
    this.projects = projects;
    this.columns = columns;
    this.tasks = tasks;
    this.settings = settings;
    this.unitOfWork = unitOfWork;
  }

  async initialize() {
    const projects = await this.projects.list();

    if (projects.length === 0) {
      return { projects, activeProject: null, columns: [], tasks: [] };
    }

    const savedProjectId = await this.settings.get("activeProjectId");
    const initialProject =
      projects.find((project) => project.id === savedProjectId) ?? projects[0];
    const graph = await this.selectProject(initialProject.id);

    return { projects, ...graph };
  }

  async createProject(input) {
    const project = createProject(input);
    const columns = createDefaultColumns(project.id);
    await this.unitOfWork.createProjectGraph(project, columns);

    return { activeProject: project, columns, tasks: [] };
  }

  async selectProject(projectId) {
    const project = await this.projects.get(projectId);

    if (!project || project.archived) {
      throw new Error("El proyecto seleccionado no existe o esta archivado.");
    }

    const [columns, tasks] = await Promise.all([
      this.columns.listByProject(project.id),
      this.tasks.listByProject(project.id),
    ]);
    await this.settings.set("activeProjectId", project.id);

    return { activeProject: project, columns, tasks };
  }
}

namespace.domain.ProjectService = ProjectService;
})(globalThis.LocalKanban);
