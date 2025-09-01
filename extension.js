const vscode = require("vscode");
const path = require("path");

let lastFiles = [];

async function closeDistractions() {
    console.log("Hide the sidebar");
    await vscode.commands.executeCommand("workbench.action.closeSidebar");

    console.log("Close all other editors");
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
}

async function openFiles(files) {
    if (!files || files.length === 0) {
        console.debug("No files to open");
        return;
    }

    // Compare with last opened files
    const filesChanged = JSON.stringify(files) !== JSON.stringify(lastFiles);
    if (!filesChanged) {
        return; // nothing changed
    }

    try {
        // Open each file
        for (const file of files) {
            const filePath = path.isAbsolute(file)
                ? file
                : path.join(vscode.workspace.rootPath || "", file);
            const doc = await vscode.workspace.openTextDocument(filePath);

            console.debug("Opening document " + doc);
            await vscode.window.showTextDocument(doc);
        }

        // update lastFiles after successful open
        lastFiles = files;
    } catch (err) {
        console.error("Error opening files:", err);
    }
}

function activate(context) {
    closeDistractions();

    const config = vscode.workspace.getConfiguration();
    const filesToOpen = config.get("openOnce.files", []);
    console.debug("Files to open: ");
    console.debug(filesToOpen);
    openFiles(filesToOpen);

    // Listen for changes in openOnce.files
    const disposable = vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration("openOnce.files")) {
            const updatedFiles = vscode.workspace.getConfiguration().get("openOnce.files", []);
            openFiles(updatedFiles);
        }
    });

    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = { activate, deactivate };
