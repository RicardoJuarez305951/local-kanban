import { nowIso } from "../shared/dates.js";
import { createId } from "../shared/ids.js";
import { normalizeProjectInput } from "./validation.js";

export function createProject(input, options = {}) {
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
