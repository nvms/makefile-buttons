import * as vscode from "vscode";
import path from "path";

export function activate(context: vscode.ExtensionContext) {
  const codelensProvider = new MakefileCodelensProvider();

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { scheme: "file", language: "makefile" },
      codelensProvider,
    ),
  );

  const disposable = vscode.commands.registerCommand(
    "extension.runCommand",
    (target: string, filePath: string) => {
      runCommand(target, filePath);
    },
  );
}

class MakefileCodelensProvider implements vscode.CodeLensProvider {
  protected enabled = true;
  private onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();

  private _onDidChangeCodeLenses: vscode.EventEmitter<void> =
    new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> =
    this._onDidChangeCodeLenses.event;

  public setEnabled(enabled: false): void {
    if (this.enabled !== enabled) {
      this.enabled = enabled;
      this.onDidChangeCodeLensesEmitter.fire();
    }
  }

  constructor() {
    vscode.workspace.onDidChangeConfiguration((_) => {
      this._onDidChangeCodeLenses.fire();
    });
  }

  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): vscode.CodeLens[] {
    if (!this.enabled) {
      return [];
    }

    if (
      !(
        document.fileName.endsWith("Makefile") ||
        document.fileName.endsWith("makefile")
      )
    ) {
      return [];
    }

    const codeLenses = this.findMatches(document);

    return ([] as vscode.CodeLens[]).concat(...codeLenses);
  }

  public findMatches(document: vscode.TextDocument): vscode.CodeLens[] {
    const codeLenses: vscode.CodeLens[] = [];
    const pattern = /^([\w\-]+):(?!=)/m;

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const simpleMatch = line.text.match(pattern);

      if (simpleMatch) {
        const target = simpleMatch[1];

        codeLenses.push(
          new vscode.CodeLens(line.range, {
            title: "make " + target,
            command: "extension.runCommand",
            arguments: [target, document.fileName],
            tooltip: "executes target " + target,
          }),
        );
      }
    }
    return codeLenses;
  }
}

function runCommand(target: string, filePath: string) {
  const makefileDir = path.dirname(filePath);
  const t = vscode.window.createTerminal({ cwd: makefileDir });

  t.show(false);
  t.sendText(`make ${target}`);
}
