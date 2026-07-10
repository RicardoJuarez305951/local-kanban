(function registerDates(namespace) {
  function nowIso() {
    return new Date().toISOString();
  }

  namespace.shared.nowIso = nowIso;
})(globalThis.LocalKanban);
