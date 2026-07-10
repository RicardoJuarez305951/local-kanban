(function registerErrors(namespace) {
  const { ValidationError } = namespace.domain;

  function toUserMessage(error) {
    if (error instanceof ValidationError) {
      return error.message;
    }

    if (error?.name === "QuotaExceededError") {
      return "No hay espacio disponible para guardar los datos locales.";
    }

    return "Ocurrió un error al trabajar con los datos locales. Intenta de nuevo.";
  }

  function installGlobalErrorHandlers(onError) {
    globalThis.addEventListener("error", (event) => {
      onError(event.error ?? new Error(event.message));
    });

    globalThis.addEventListener("unhandledrejection", (event) => {
      onError(event.reason ?? new Error("Promesa rechazada sin manejar."));
    });
  }

  Object.assign(namespace.core, { toUserMessage, installGlobalErrorHandlers });
})(globalThis.LocalKanban);
