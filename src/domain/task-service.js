(function registerTaskService(namespace) {
  const { createTask, taskWithColumn, updateTask } = namespace.domain;

  class TaskService {
    constructor({ projects, columns, tasks, unitOfWork }) {
      this.projects = projects;
      this.columns = columns;
      this.tasks = tasks;
      this.unitOfWork = unitOfWork;
    }

    async getBoard(projectId) {
      const [columns, tasks] = await Promise.all([
        this.columns.listByProject(projectId),
        this.tasks.listByProject(projectId),
      ]);
      return { columns, tasks };
    }

    async assertProject(projectId) {
      const project = await this.projects.get(projectId);
      if (!project || project.archived) {
        throw new Error("El proyecto activo no existe o esta archivado.");
      }
      return project;
    }

    async assertColumn(projectId, columnId) {
      const column = await this.columns.get(columnId);
      if (!column || column.projectId !== projectId) {
        throw new Error("La columna seleccionada no pertenece al proyecto activo.");
      }
      return column;
    }

    async createTask(projectId, columnId, input) {
      await this.assertProject(projectId);
      const column = await this.assertColumn(projectId, columnId);
      const columnTasks = await this.tasks.listByColumn(projectId, columnId);
      const task = createTask(input, {
        projectId,
        columnId,
        order: columnTasks.length,
        completedAt: column.type === "done" ? new Date().toISOString() : null,
      });

      await this.tasks.add(task);
      return this.getBoard(projectId);
    }

    async updateTask(taskId, input) {
      const existingTask = await this.tasks.get(taskId);
      if (!existingTask) {
        throw new Error("La tarea seleccionada no existe.");
      }

      const updatedTask = updateTask(existingTask, input);
      await this.tasks.update(updatedTask);
      return this.getBoard(updatedTask.projectId);
    }

    async deleteTask(taskId) {
      const deletedTask = await this.unitOfWork.deleteTask(taskId);
      return this.getBoard(deletedTask.projectId);
    }

    async moveTask(projectId, taskId, targetColumnId, beforeTaskId = null) {
      await this.assertProject(projectId);
      await this.assertColumn(projectId, targetColumnId);
      await this.unitOfWork.moveTask({
        projectId,
        taskId,
        targetColumnId,
        beforeTaskId,
        now: () => new Date().toISOString(),
        taskWithColumn,
      });
      return this.getBoard(projectId);
    }
  }

  namespace.domain.TaskService = TaskService;
})(globalThis.LocalKanban);
