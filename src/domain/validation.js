export class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

export function normalizeOptionalText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeProjectInput(input = {}) {
  const project = {
    name: normalizeOptionalText(input.name),
    description: normalizeOptionalText(input.description),
    repository: normalizeOptionalText(input.repository),
    localPath: normalizeOptionalText(input.localPath),
  };

  if (!project.name) {
    throw new ValidationError("El nombre del proyecto es obligatorio.", "name");
  }

  return project;
}
