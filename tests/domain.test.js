import assert from "node:assert/strict";
import test from "node:test";

import { createDefaultColumns } from "../src/domain/column-model.js";
import { createProject } from "../src/domain/project-model.js";
import { normalizeProjectInput, ValidationError } from "../src/domain/validation.js";
import { createId } from "../src/shared/ids.js";

test("rechaza nombres de proyecto vacíos", () => {
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
