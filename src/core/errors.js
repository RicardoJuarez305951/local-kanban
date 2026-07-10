import { ValidationError } from "../domain/validation.js";

export function toUserMessage(error) {
  if (error instanceof ValidationError) {
    return error.message;
  }

  if (error?.name === "QuotaExceededError") {
    return "No hay espacio disponible para guardar los datos locales.";
  }

  return "Ocurrió un error al trabajar con los datos locales. Intenta de nuevo.";
}

export function installGlobalErrorHandlers(onError) {
  window.addEventListener("error", (event) => {
    onError(event.error ?? new Error(event.message));
  });

  window.addEventListener("unhandledrejection", (event) => {
    onError(event.reason ?? new Error("Promesa rechazada sin manejar."));
  });
}
