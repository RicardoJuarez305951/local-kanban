(function registerSettingsRepository(namespace) {
const { executeRequest, STORES } = namespace.persistence;

function createSettingsRepository(database) {
  return {
    async get(key) {
      const setting = await executeRequest(database, STORES.settings, "readonly", (store) =>
        store.get(key),
      );
      return setting?.value ?? null;
    },

    async list() {
      const settings = await executeRequest(database, STORES.settings, "readonly", (store) =>
        store.getAll(),
      );
      return settings;
    },

    async set(key, value) {
      await executeRequest(database, STORES.settings, "readwrite", (store) =>
        store.put({ key, value }),
      );
      return value;
    },

    async delete(key) {
      await executeRequest(database, STORES.settings, "readwrite", (store) => store.delete(key));
    },
  };
}

namespace.persistence.repositories.createSettingsRepository = createSettingsRepository;
})(globalThis.LocalKanban);
