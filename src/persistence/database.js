(function registerDatabase(namespace) {
const DATABASE_NAME = "local-kanban";
const DATABASE_VERSION = 1;

const STORES = Object.freeze({
  projects: "projects",
  columns: "columns",
  tasks: "tasks",
  settings: "settings",
});

function createSchema(database) {
  const projects = database.createObjectStore(STORES.projects, { keyPath: "id" });
  projects.createIndex("name", "name");
  projects.createIndex("archived", "archived");
  projects.createIndex("updatedAt", "updatedAt");

  const columns = database.createObjectStore(STORES.columns, { keyPath: "id" });
  columns.createIndex("projectId", "projectId");
  columns.createIndex("projectId_order", ["projectId", "order"], { unique: true });
  columns.createIndex("type", "type");

  const tasks = database.createObjectStore(STORES.tasks, { keyPath: "id" });
  tasks.createIndex("projectId", "projectId");
  tasks.createIndex("columnId", "columnId");
  tasks.createIndex("projectId_columnId", ["projectId", "columnId"]);
  tasks.createIndex("dueDate", "dueDate");
  tasks.createIndex("priority", "priority");
  tasks.createIndex("updatedAt", "updatedAt");
  tasks.createIndex("completedAt", "completedAt");

  database.createObjectStore(STORES.settings, { keyPath: "key" });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new Error("Falló una solicitud de IndexedDB.")),
      { once: true },
    );
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () => reject(transaction.error ?? new Error("La transacción fue cancelada.")),
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () => reject(transaction.error ?? new Error("Falló una transacción de IndexedDB.")),
      { once: true },
    );
  });
}

function openDatabase(options = {}) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.addEventListener("upgradeneeded", (event) => {
      if (event.oldVersion === 0) {
        createSchema(request.result);
      }
    });

    request.addEventListener("blocked", () => {
      options.onBlocked?.();
    });

    request.addEventListener("error", () => {
      reject(request.error ?? new Error("No se pudo abrir IndexedDB."));
    });

    request.addEventListener("success", () => {
      const database = request.result;
      database.addEventListener("versionchange", () => {
        database.close();
        options.onVersionChange?.();
      });
      resolve(database);
    });
  });
}

async function performTransaction(database, storeNames, mode, operation) {
  const transaction = database.transaction(storeNames, mode);
  const stores = Object.fromEntries(
    storeNames.map((storeName) => [storeName, transaction.objectStore(storeName)]),
  );
  const completion = transactionDone(transaction);

  try {
    const result = await operation(stores, transaction);
    await completion;
    return result;
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      // La transacción ya terminó o fue cancelada por IndexedDB.
    }
    await completion.catch(() => {});
    throw error;
  }
}

async function executeRequest(database, storeName, mode, createRequest) {
  const transaction = database.transaction(storeName, mode);
  const completion = transactionDone(transaction);
  try {
    const result = await requestToPromise(createRequest(transaction.objectStore(storeName)));
    await completion;
    return result;
  } catch (error) {
    await completion.catch(() => {});
    throw error;
  }
}

Object.assign(namespace.persistence, {
  DATABASE_NAME,
  DATABASE_VERSION,
  STORES,
  requestToPromise,
  transactionDone,
  openDatabase,
  performTransaction,
  executeRequest,
});
})(globalThis.LocalKanban);
