(function initializeNamespace(global) {
  const namespace = global.LocalKanban ?? {};

  namespace.shared ??= {};
  namespace.domain ??= {};
  namespace.core ??= {};
  namespace.persistence ??= {};
  namespace.persistence.repositories ??= {};
  namespace.ui ??= {};

  global.LocalKanban = namespace;
})(globalThis);
