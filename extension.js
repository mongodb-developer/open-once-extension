const vscode = require("vscode");
const path = require("path");

async function openFileAndCloseOthers(filePath) {
    try {
        // Hide the sidebar
        await vscode.commands.executeCommand("workbench.action.closeSidebar");

        // Close all other editors
        await vscode.commands.executeCommand("workbench.action.closeAllEditors");

        // Open the requested file
        const uri = vscode.Uri.file(filePath);
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc, { preview: false });
    } catch (err) {
        console.error("Failed to open file:", filePath, err);
    }
}

async function activate(context) {
    const config = vscode.workspace.getConfiguration("openOnce");
    const filesToOpen = config.get("files", []);

    const alreadyOpened = context.workspaceState.get("openOnce.done");

    // Original behavior: open configured files once
    if (!alreadyOpened && filesToOpen.length > 0) {
        for (const file of filesToOpen) {
            const fullPath = path.join(vscode.workspace.rootPath || "", file);
            await openFileAndCloseOthers(fullPath);
        }
        context.workspaceState.update("openOnce.done", true);
    }

    // Register the new command
    let disposable = vscode.commands.registerCommand("openOnce.openFile", async (filePath) => {
        await openFileAndCloseOthers(filePath);
    });

    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = { activate, deactivate };

