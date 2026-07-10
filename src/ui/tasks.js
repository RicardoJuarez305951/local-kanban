(function registerTasksUi(namespace) {
  function openTaskEditor(shell, options) {
    const task = options.task ?? null;
    shell.taskForm.reset();
    shell.taskId.value = task?.id ?? "";
    shell.taskColumnId.value = task?.columnId ?? options.columnId ?? "";
    shell.taskTitle.value = task?.title ?? "";
    shell.taskDescription.value = task?.description ?? "";
    shell.taskPriority.value = task?.priority ?? "none";
    shell.taskDueDate.value = task?.dueDate ?? "";
    shell.taskLabels.value = task?.labels?.join(", ") ?? "";
    shell.taskEditorTitle.textContent = task ? "Editar tarea" : "Nueva tarea";
    shell.deleteTaskButton.hidden = !task;
    shell.taskEditor.hidden = false;
    shell.taskTitle.focus();
  }

  function renderTaskEditor(shell, editor, tasks) {
    const key = editor?.open
      ? `${editor.taskId ?? "new"}:${editor.columnId ?? ""}`
      : "closed";
    if (shell.taskEditor.dataset.renderKey === key) {
      return;
    }

    shell.taskEditor.dataset.renderKey = key;
    if (!editor?.open) {
      closeTaskEditor(shell);
      return;
    }

    const task = editor.taskId
      ? tasks.find((candidate) => candidate.id === editor.taskId) ?? null
      : null;
    openTaskEditor(shell, { task, columnId: editor.columnId });
  }

  function closeTaskEditor(shell) {
    shell.taskEditor.hidden = true;
    shell.taskForm.reset();
  }

  function focusTaskField(shell, field) {
    const fieldMap = {
      title: shell.taskTitle,
      description: shell.taskDescription,
      priority: shell.taskPriority,
      dueDate: shell.taskDueDate,
      labels: shell.taskLabels,
    };
    fieldMap[field]?.focus();
  }

  function downloadJson(payload, fileName) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  Object.assign(namespace.ui, {
    closeTaskEditor,
    downloadJson,
    focusTaskField,
    openTaskEditor,
    renderTaskEditor,
  });
})(globalThis.LocalKanban);
