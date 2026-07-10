function createProjectButton(project, isActive) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "project-option";
  button.dataset.projectId = project.id;
  button.setAttribute("aria-pressed", String(isActive));

  const marker = document.createElement("span");
  marker.className = "project-option__marker";
  marker.textContent = project.name.slice(0, 1).toLocaleUpperCase("es");
  marker.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.className = "project-option__text";

  const name = document.createElement("strong");
  name.textContent = project.name;
  text.append(name);

  if (project.description) {
    const description = document.createElement("small");
    description.textContent = project.description;
    text.append(description);
  }

  button.append(marker, text);
  return button;
}

export function renderProjects(shell, projects, activeProject) {
  const fragment = document.createDocumentFragment();

  if (projects.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "project-list__empty";
    emptyMessage.textContent = "Aún no hay proyectos.";
    fragment.append(emptyMessage);
  } else {
    projects.forEach((project) => {
      fragment.append(createProjectButton(project, project.id === activeProject?.id));
    });
  }

  shell.projectList.replaceChildren(fragment);
  shell.projectCount.textContent = String(projects.length);
}
