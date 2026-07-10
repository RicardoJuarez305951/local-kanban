export function createId() {
  if (!globalThis.crypto?.randomUUID) {
    throw new Error("Este navegador no admite crypto.randomUUID().");
  }

  return globalThis.crypto.randomUUID();
}
