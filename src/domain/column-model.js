import { nowIso } from "../shared/dates.js";
import { createId } from "../shared/ids.js";

export const DEFAULT_COLUMN_DEFINITIONS = Object.freeze([
  Object.freeze({ name: "Entrada", type: "inbox" }),
  Object.freeze({ name: "Por hacer", type: "todo" }),
  Object.freeze({ name: "En progreso", type: "in_progress" }),
  Object.freeze({ name: "Bloqueado", type: "blocked" }),
  Object.freeze({ name: "Terminado", type: "done" }),
]);

export function createDefaultColumns(projectId, options = {}) {
  if (!projectId) {
    throw new Error("Se requiere projectId para crear columnas.");
  }

  const idFactory = options.idFactory ?? createId;
  const timestamp = (options.now ?? nowIso)();

  return DEFAULT_COLUMN_DEFINITIONS.map((definition, order) => ({
    id: idFactory(),
    projectId,
    name: definition.name,
    type: definition.type,
    order,
    wipLimit: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}
