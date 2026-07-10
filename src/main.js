import { bootstrapApplication } from "./core/app.js";
import { getShell } from "./ui/shell.js";

const shell = getShell();

bootstrapApplication(shell).catch((error) => {
  console.error("No se pudo iniciar Kanban local.", error);
  shell.loadingView.hidden = true;
  shell.statusBanner.hidden = false;
  shell.statusBanner.dataset.type = "error";
  shell.statusBanner.textContent =
    "No se pudo iniciar la aplicación. Revisa la consola del navegador.";
});
