const ts = require("typescript");

module.exports = function (source) {
  if (this.resourcePath.endsWith(".css")) {
    return `const style = document.createElement('style'); style.textContent = ${JSON.stringify(source)}; document.head.appendChild(style);`;
  }
  return ts.transpileModule(source, {
    fileName: this.resourcePath,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true
    }
  }).outputText;
};
