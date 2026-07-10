(function registerState(namespace) {
  const INITIAL_STATE = Object.freeze({
    projects: [],
    activeProject: null,
    columns: [],
    tasks: [],
    loading: true,
    error: null,
  });

  function createStore(initialState = INITIAL_STATE) {
    let state = { ...initialState };
    const listeners = new Set();

    return {
      getState() {
        return state;
      },

      setState(patch) {
        state = { ...state, ...patch };
        listeners.forEach((listener) => listener(state));
      },

      subscribe(listener) {
        listeners.add(listener);
        listener(state);
        return () => listeners.delete(listener);
      },
    };
  }

  Object.assign(namespace.core, { INITIAL_STATE, createStore });
})(globalThis.LocalKanban);
