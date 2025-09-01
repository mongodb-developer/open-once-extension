const vscode = require("vscode");
const path = require("path");
const http = require("http");

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

function activate(context) {
    const port = 8090; // local port for commands

    const server = http.createServer(async (req, res) => {
        if (req.method === "POST" && req.url.startsWith("/open-file")) {
            let body = "";
            req.on("data", chunk => body += chunk);
            req.on("end", async () => {
                try {
                    const data = JSON.parse(body);
                    if (!data.file) throw new Error("Missing 'file' field");
                    const filePath = path.isAbsolute(data.file)
                        ? data.file
                        : path.join(vscode.workspace.rootPath || "", data.file);
                    await openFileAndCloseOthers(filePath);
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true }));
                } catch (err) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ success: false, error: err.message }));
                }
            });
        } else {
            res.writeHead(404);
            res.end("Not found");
        }
    });

    server.listen(port, "127.0.0.1", () => {
        console.log(`Open-once HTTP server listening on http://127.0.0.1:${port}`);
    });

    context.subscriptions.push({ dispose: () => server.close() });
}

function deactivate() {}

module.exports = { activate, deactivate };
