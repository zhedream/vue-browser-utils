(() => {
  if (!document.currentScript || !document.currentScript.resolve) {
    throw new Error("must load by moduleM loadModule");
  }
  const currentScript = document.currentScript;
  const exposeModule = currentScript.exposeModule;
  console.log("module loaded", currentScript.id, "load id", exposeModule.id);
  if (exposeModule.id !== currentScript.id) {
    throw currentScript.reject("exposeModule.id !== document.currentScript.id");
  }
  try {
    const log = (...args) => {
      console.log(...args);
    };
    const logError = (...args) => {
      console.error(...args);
    };
    const logWarn = (...args) => {
      console.warn(...args);
    };
    exposeModule(() => ({
      log,
      logError,
      logWarn
    }));
  } catch (error) {
    document.currentScript.reject(error);
  }
})();

//# sourceMappingURL=tool.m.js.map