const vscode = require("vscode");
const path = require("path");

let lastFiles = [];

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function closeDistractions() {
    console.log("Hide the sidebar");
    await vscode.commands.executeCommand("workbench.action.closeSidebar");

    console.log("Close all other editors");
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
}

async function openNotebook(uri) {
    // Ensure Jupyter extension is activated before opening the files
    let jupyterExt;
    do {
        jupyterExt = vscode.extensions.getExtension('ms-toolsai.jupyter');
        try {
            await jupyterExt.activate();
        } catch (error) {
            console.error("Failed to activate Jupyter extension:", error);
            await sleep(1000);
        }
    } while (!(jupyterExt?.isActive));

    const notebookEditors = ['jupyter-notebook', 'jupyter-notebook.editor'];
    for (const editor of notebookEditors) {
        try {
            await vscode.commands.executeCommand('vscode.openWith', uri, editor);
            console.log(`Opened notebook with editor: ${editor}`);
            return;
        } catch (err) {
            console.warn(`Failed to open with ${editor}:`, err);
        }
    }
}

async function openFiles(files) {
    // Open each file
    for (const file of files) {
        const filePath = path.isAbsolute(file)
            ? file
            : path.join(vscode.workspace.workspaceFolders[0].uri.fsPath || "", file);

        const uri = vscode.Uri.file(filePath);

        if (filePath.endsWith('.ipynb')) {
            // Open Jupyter notebook
            console.log("Opening Jupyter notebook: " + filePath);
            try {
                await openNotebook(uri);
            } catch (error) {
                console.error("Error opening Jupyter notebook:", error);
            }
        } else {
            // Open as normal text document
            const doc = await vscode.workspace.openTextDocument(uri);
            console.log("Opening file: " + doc.uri.fsPath);
            try {
                await vscode.window.showTextDocument(doc, { preview: false });
            } catch (error) {
                console.error("Error opening file:", error);
            }
        }
    }

    // update lastFiles after successful open
    lastFiles = files;
}

function activate(context) {
    const config = vscode.workspace.getConfiguration();
    const filesToOpen = config.get("openOnce.files", []);
    console.log("Files to open: ");
    console.log(filesToOpen);

    if (!filesToOpen || filesToOpen.length === 0) {
        console.log("No files to open");
        return;
    }

    // Compare with last opened files
    const filesChanged = JSON.stringify(filesToOpen) !== JSON.stringify(lastFiles);
    if (!filesChanged) {
        return; // nothing changed
    }

    closeDistractions().then(() => {
        openFiles(filesToOpen);
        // Listen for changes in openOnce.files
        const disposable = vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration("openOnce.files")) {
                const updatedFiles = vscode.workspace.getConfiguration().get("openOnce.files", lastFiles);
                openFiles(updatedFiles);
            }
        });

        context.subscriptions.push(disposable);
    });
}

function deactivate() {}

module.exports = { activate, deactivate };
