import assert from "node:assert/strict";
import test from "node:test";

await import("../src/namespace.js");
await import("../src/shared/ids.js");
await import("../src/shared/dates.js");
await import("../src/domain/validation.js");
await import("../src/domain/project-model.js");
await import("../src/domain/column-model.js");
await import("../src/domain/task-model.js");
await import("../src/persistence/task-unit-of-work.js");
await import("../src/persistence/project-transfer-service.js");

const { createId } = globalThis.LocalKanban.shared;
const {
  createDefaultColumns,
  createProject,
  createTask,
  normalizeProjectInput,
  normalizeTaskInput,
  taskWithColumn,
  ValidationError,
} = globalThis.LocalKanban.domain;
const {
  createExportPayload,
  createProjectFilePayload,
  getProjectFileName,
  parseProjectFilePayload,
  planTaskMove,
  prepareImportGraphs,
} =
  globalThis.LocalKanban.persistence;

test("rechaza nombres de proyecto vacios", () => {
  assert.throws(
    () => normalizeProjectInput({ name: "   " }),
    (error) => error instanceof ValidationError && error.field === "name",
  );
});

test("normaliza todos los campos de texto del proyecto", () => {
  assert.deepEqual(
    normalizeProjectInput({
      name: "  Proyecto personal  ",
      description: "  Pendientes del trimestre  ",
      repository: "  owner/repo  ",
      localPath: "  C:\\Trabajo\\repo  ",
    }),
    {
      name: "Proyecto personal",
      description: "Pendientes del trimestre",
      repository: "owner/repo",
      localPath: "C:\\Trabajo\\repo",
    },
  );
});

test("crea el proyecto con identificador, fechas y valores iniciales", () => {
  const project = createProject(
    { name: "Kanban" },
    {
      idFactory: () => "project-1",
      now: () => "2026-07-10T12:00:00.000Z",
    },
  );

  assert.deepEqual(project, {
    id: "project-1",
    name: "Kanban",
    description: "",
    repository: "",
    localPath: "",
    archived: false,
    createdAt: "2026-07-10T12:00:00.000Z",
    updatedAt: "2026-07-10T12:00:00.000Z",
  });
});

test("crea exactamente las cinco columnas predeterminadas", () => {
  let sequence = 0;
  const columns = createDefaultColumns("project-1", {
    idFactory: () => `column-${++sequence}`,
    now: () => "2026-07-10T12:00:00.000Z",
  });

  assert.equal(columns.length, 5);
  assert.deepEqual(
    columns.map(({ name, type, order, wipLimit, projectId }) => ({
      name,
      type,
      order,
      wipLimit,
      projectId,
    })),
    [
      { name: "Entrada", type: "inbox", order: 0, wipLimit: null, projectId: "project-1" },
      { name: "Por hacer", type: "todo", order: 1, wipLimit: null, projectId: "project-1" },
      {
        name: "En progreso",
        type: "in_progress",
        order: 2,
        wipLimit: null,
        projectId: "project-1",
      },
      {
        name: "Bloqueado",
        type: "blocked",
        order: 3,
        wipLimit: null,
        projectId: "project-1",
      },
      { name: "Terminado", type: "done", order: 4, wipLimit: null, projectId: "project-1" },
    ],
  );
  assert.equal(new Set(columns.map((column) => column.id)).size, 5);
  assert.ok(columns.every((column) => !Number.isNaN(Date.parse(column.createdAt))));
});

test("genera UUID distintos", () => {
  const firstId = createId();
  const secondId = createId();
  assert.notEqual(firstId, secondId);
  assert.match(
    firstId,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
});

test("rechaza titulos de tarea vacios", () => {
  assert.throws(
    () => normalizeTaskInput({ title: "   " }),
    (error) => error instanceof ValidationError && error.field === "title",
  );
});

test("normaliza campos de tarea", () => {
  assert.deepEqual(
    normalizeTaskInput({
      title: "  Preparar release  ",
      description: "  Revisar pendientes  ",
      priority: "medium",
      dueDate: "2026-08-15",
      labels: " release, QA, release ",
    }),
    {
      title: "Preparar release",
      description: "Revisar pendientes",
      priority: "medium",
      dueDate: "2026-08-15",
      labels: ["release", "QA"],
    },
  );
});

test("valida prioridad y fecha de tarea", () => {
  assert.throws(
    () => normalizeTaskInput({ title: "Tarea", priority: "urgent" }),
    (error) => error instanceof ValidationError && error.field === "priority",
  );
  assert.throws(
    () => normalizeTaskInput({ title: "Tarea", dueDate: "2026-02-31" }),
    (error) => error instanceof ValidationError && error.field === "dueDate",
  );
});

test("crea tarea con orden, identificador y fechas", () => {
  const task = createTask(
    { title: " Capturar bug ", labels: [" ui "] },
    {
      projectId: "project-1",
      columnId: "column-1",
      order: 2,
      idFactory: () => "task-1",
      now: () => "2026-07-10T12:00:00.000Z",
    },
  );

  assert.deepEqual(task, {
    id: "task-1",
    projectId: "project-1",
    columnId: "column-1",
    title: "Capturar bug",
    description: "",
    priority: "none",
    dueDate: null,
    labels: ["ui"],
    order: 2,
    createdAt: "2026-07-10T12:00:00.000Z",
    updatedAt: "2026-07-10T12:00:00.000Z",
    completedAt: null,
  });
});

test("marca y limpia completedAt al entrar y salir de Terminado", () => {
  const task = {
    id: "task-1",
    projectId: "project-1",
    columnId: "todo",
    completedAt: null,
    updatedAt: "2026-07-10T12:00:00.000Z",
  };

  const doneTask = taskWithColumn(
    task,
    { id: "done", projectId: "project-1", type: "done" },
    { now: () => "2026-07-11T12:00:00.000Z" },
  );
  assert.equal(doneTask.completedAt, "2026-07-11T12:00:00.000Z");

  const reopenedTask = taskWithColumn(
    doneTask,
    { id: "todo", projectId: "project-1", type: "todo" },
    { now: () => "2026-07-12T12:00:00.000Z" },
  );
  assert.equal(reopenedTask.completedAt, null);
});

test("mueve tareas entre columnas y renumera orden", () => {
  const projectTasks = [
    { id: "a", projectId: "p1", columnId: "todo", order: 0, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", completedAt: null },
    { id: "b", projectId: "p1", columnId: "todo", order: 1, createdAt: "2026-01-02T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z", completedAt: null },
    { id: "c", projectId: "p1", columnId: "doing", order: 0, createdAt: "2026-01-03T00:00:00.000Z", updatedAt: "2026-01-03T00:00:00.000Z", completedAt: null },
  ];

  const result = planTaskMove({
    projectId: "p1",
    projectTasks,
    taskId: "b",
    targetColumn: { id: "doing", projectId: "p1", type: "in_progress", wipLimit: null },
    beforeTaskId: "c",
    now: () => "2026-07-10T12:00:00.000Z",
    taskWithColumn,
  });

  assert.deepEqual(
    result.map(({ id, columnId, order }) => ({ id, columnId, order })),
    [
      { id: "a", columnId: "todo", order: 0 },
      { id: "b", columnId: "doing", order: 0 },
      { id: "c", columnId: "doing", order: 1 },
    ],
  );
});

test("respeta limite WIP al mover tareas", () => {
  assert.throws(
    () =>
      planTaskMove({
        projectId: "p1",
        projectTasks: [
          { id: "a", projectId: "p1", columnId: "todo", order: 0, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", completedAt: null },
          { id: "b", projectId: "p1", columnId: "doing", order: 0, createdAt: "2026-01-02T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z", completedAt: null },
        ],
        taskId: "a",
        targetColumn: { id: "doing", projectId: "p1", type: "in_progress", wipLimit: 1 },
        beforeTaskId: null,
        now: () => "2026-07-10T12:00:00.000Z",
        taskWithColumn,
      }),
    /limite de trabajo/,
  );
});

test("exporta proyecto con columnas y tareas", () => {
  const payload = createExportPayload("project", [
    {
      project: { id: "p1", name: "Proyecto" },
      columns: [{ id: "c1", projectId: "p1" }],
      tasks: [{ id: "t1", projectId: "p1", columnId: "c1" }],
    },
  ]);

  assert.equal(payload.format, "local-kanban");
  assert.equal(payload.version, 1);
  assert.equal(payload.kind, "project");
  assert.equal(payload.projects[0].tasks.length, 1);
});

test("crea JSON editable de un proyecto", () => {
  const payload = createProjectFilePayload({
    project: {
      id: "p1",
      name: "Proyecto",
      description: "",
      repository: "",
      localPath: "",
      archived: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    columns: [
      { id: "c1", projectId: "p1", name: "Entrada", type: "inbox", order: 0, wipLimit: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
      { id: "c2", projectId: "p1", name: "Por hacer", type: "todo", order: 1, wipLimit: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
      { id: "c3", projectId: "p1", name: "En progreso", type: "in_progress", order: 2, wipLimit: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
      { id: "c4", projectId: "p1", name: "Bloqueado", type: "blocked", order: 3, wipLimit: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
      { id: "c5", projectId: "p1", name: "Terminado", type: "done", order: 4, wipLimit: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
    ],
    tasks: [],
  });

  assert.equal(payload.format, "local-kanban-project");
  assert.equal(payload.version, 1);
  assert.equal(payload.project.id, "p1");
});

test("importa varios proyectos regenerando IDs y preservando relaciones", () => {
  const source = createExportPayload("projects", [
    {
      project: {
        id: "p1",
        name: "Proyecto",
        description: "",
        repository: "",
        localPath: "",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      columns: [
        { id: "c1", projectId: "p1", name: "Entrada", type: "inbox", order: 0, wipLimit: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
        { id: "c2", projectId: "p1", name: "Por hacer", type: "todo", order: 1, wipLimit: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
        { id: "c3", projectId: "p1", name: "En progreso", type: "in_progress", order: 2, wipLimit: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
        { id: "c4", projectId: "p1", name: "Bloqueado", type: "blocked", order: 3, wipLimit: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
        { id: "c5", projectId: "p1", name: "Terminado", type: "done", order: 4, wipLimit: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
      ],
      tasks: [
        {
          id: "t1",
          projectId: "p1",
          columnId: "c2",
          title: "Tarea",
          description: "",
          priority: "low",
          dueDate: null,
          labels: ["ui"],
          order: 0,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          completedAt: null,
        },
      ],
    },
  ]);

  const [graph] = prepareImportGraphs(source);
  assert.notEqual(graph.project.id, "p1");
  assert.equal(graph.columns.every((column) => column.projectId === graph.project.id), true);
  assert.equal(graph.tasks[0].projectId, graph.project.id);
  assert.equal(
    graph.columns.some((column) => column.id === graph.tasks[0].columnId && column.type === "todo"),
    true,
  );
});

test("rechaza JSON invalido de importacion", () => {
  assert.throws(
    () => prepareImportGraphs({ format: "otro", version: 99, kind: "project", projects: [] }),
    /version/,
  );
});

test("carga JSON editable preservando IDs y relaciones", () => {
  const payload = {
    format: "local-kanban-project",
    version: 1,
    savedAt: "2026-01-01T00:00:00.000Z",
    project: {
      id: "p1",
      name: "Proyecto editable",
      description: "",
      repository: "",
      localPath: "",
      archived: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    columns: [
      { id: "c1", projectId: "p1", name: "Entrada", type: "inbox", order: 0, wipLimit: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
      { id: "c2", projectId: "p1", name: "Por hacer", type: "todo", order: 1, wipLimit: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
      { id: "c3", projectId: "p1", name: "En progreso", type: "in_progress", order: 2, wipLimit: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
      { id: "c4", projectId: "p1", name: "Bloqueado", type: "blocked", order: 3, wipLimit: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
      { id: "c5", projectId: "p1", name: "Terminado", type: "done", order: 4, wipLimit: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
    ],
    tasks: [
      {
        id: "t1",
        projectId: "p1",
        columnId: "c2",
        title: "Tarea editable",
        description: "",
        priority: "medium",
        dueDate: null,
        labels: [],
        order: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        completedAt: null,
      },
    ],
  };

  const graph = parseProjectFilePayload(payload, "proyecto-editable.json");
  assert.equal(graph.project.id, "p1");
  assert.equal(graph.tasks[0].id, "t1");
  assert.equal(graph.fileName, "proyecto-editable.json");
  assert.equal(graph.dirty, false);
});

test("rechaza JSON editable con relaciones rotas", () => {
  assert.throws(
    () =>
      parseProjectFilePayload(
        {
          format: "local-kanban-project",
          version: 1,
          project: {
            id: "p1",
            name: "Proyecto",
            description: "",
            repository: "",
            localPath: "",
            archived: false,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
          columns: [
            { id: "c1", projectId: "p1", name: "Entrada", type: "inbox", order: 0, wipLimit: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
            { id: "c2", projectId: "p1", name: "Por hacer", type: "todo", order: 1, wipLimit: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
            { id: "c3", projectId: "p1", name: "En progreso", type: "in_progress", order: 2, wipLimit: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
            { id: "c4", projectId: "p1", name: "Bloqueado", type: "blocked", order: 3, wipLimit: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
            { id: "c5", projectId: "p1", name: "Terminado", type: "done", order: 4, wipLimit: null, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
          ],
          tasks: [
            {
              id: "t1",
              projectId: "p1",
              columnId: "missing",
              title: "Rota",
              description: "",
              priority: "none",
              dueDate: null,
              labels: [],
              order: 0,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
              completedAt: null,
            },
          ],
        },
        "roto.json",
      ),
    /relaciones invalidas/,
  );
});

test("genera nombre de archivo estable para proyectos JSON", () => {
  assert.equal(
    getProjectFileName({
      project: { name: "Mi Proyecto Local" },
      fileName: "",
    }),
    "mi-proyecto-local.json",
  );
});
