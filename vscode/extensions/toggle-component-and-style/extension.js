const vscode = require("vscode");
const fs = require("fs");

const activate = context => {
  let disposable = vscode.commands.registerCommand(
    "extension.togglecomponentandstyle",
    toggleComponentAndStyle
  );
  context.subscriptions.push(disposable);
};

const componentExtensions = {
  jsx: true
};

const styleExtensions = {
  css: true,
  scss: true
};

const toggleComponentAndStyle = async () => {
  if (!vscode.window.activeTextEditor) {
    return;
  }

  const targetFileName = getTargetFileName();
  if (targetFileName) {
    const { document, selection } = vscode.window.activeTextEditor;
    const selectedText = document.getText(selection);
    const doc = await vscode.workspace.openTextDocument(targetFileName);
    await vscode.window.showTextDocument(doc);

    if (isStyleFile(targetFileName)) {
      if (selectedText) {
        await navigateToStyle({ doc, selectedText });
      }
      if (!doc.getText()) {
        await insertFirstStyle({ doc });
      }
    }
  }
};

const getExtension = fileName => {
  const lastPeriodIndex = fileName.lastIndexOf(".");
  if (lastPeriodIndex !== -1) {
    return fileName.substring(lastPeriodIndex + 1).toLowerCase();
  }
  return "";
};

const getExtensionlessFileName = fileName => {
  const lastPeriodIndex = fileName.lastIndexOf(".");
  if (lastPeriodIndex !== -1) {
    return fileName.substring(0, lastPeriodIndex);
  }
  return fileName;
};

const stripPathFromFileName = fileName => {
  const lastSlashIndex = fileName.lastIndexOf("/");
  if (lastSlashIndex !== -1) {
    return fileName.substring(lastSlashIndex + 1);
  }
  return fileName;
};

const isComponentFile = fileName => componentExtensions[getExtension(fileName)];

const isStyleFile = fileName => styleExtensions[getExtension(fileName)];

const getTargetFileName = () => {
  const { fileName } = vscode.window.activeTextEditor.document;
  const prefix = getExtensionlessFileName(fileName);

  if (isComponentFile(fileName)) {
    let targetFileName = `${prefix}.scss`;
    if (!fs.existsSync(targetFileName)) {
      targetFileName = `${prefix}.css`;
      if (!fs.existsSync(targetFileName)) {
        fs.openSync(targetFileName, "w");
      }
    }
    return targetFileName;
  }

  if (isStyleFile(fileName)) {
    const targetFileName = `${prefix}.jsx`;
    if (fs.existsSync(targetFileName)) {
      return targetFileName;
    }
  }
};

const navigateToStyle = async ({ doc, selectedText }) => {
  let hasStyle = false;
  const { activeTextEditor } = vscode.window;
  const lineCount = doc.lineCount;

  for (let lineNumber = 0; lineNumber < lineCount && !hasStyle; lineNumber++) {
    const { text } = doc.lineAt(lineNumber);
    if (
      text.startsWith(`.${selectedText} {`) ||
      text.startsWith(`.${selectedText}{`)
    ) {
      const nextLine = lineNumber + 1;
      activeTextEditor.selection = new vscode.Selection(
        nextLine,
        0,
        nextLine,
        0
      );
      activeTextEditor.revealRange(
        new vscode.Range(nextLine, 0, nextLine, 0),
        vscode.TextEditorRevealType.InCenter
      );
      hasStyle = true;
    }
  }

  if (!hasStyle) {
    await activeTextEditor.edit(editBuilder => {
      editBuilder.insert(
        new vscode.Position(lineCount, 0),
        `\n\n.${selectedText} {\n    \n}`
      );
    });
    const cursorLineNumber = lineCount + 2;
    activeTextEditor.selection = new vscode.Selection(
      cursorLineNumber,
      4,
      cursorLineNumber,
      4
    );
    activeTextEditor.revealRange(
      new vscode.Range(cursorLineNumber, 0, cursorLineNumber, 0),
      vscode.TextEditorRevealType.InCenter
    );
  }
};

const insertFirstStyle = async ({ doc }) => {
  const { activeTextEditor } = vscode.window;
  const { fileName } = activeTextEditor.document;
  const style = stripPathFromFileName(getExtensionlessFileName(fileName));

  await activeTextEditor.edit(editBuilder => {
    editBuilder.insert(new vscode.Position(0, 0), `.${style} {\n    \n}`);
  });
  activeTextEditor.selection = new vscode.Selection(1, 4, 1, 4);
};

const deactivate = () => {};

exports.activate = activate;

module.exports = {
  activate,
  deactivate
};
