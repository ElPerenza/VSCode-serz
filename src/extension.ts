import { exec } from "child_process"
import * as fs from "fs"
import * as path from "path"
import { promisify } from "util"
import * as vscode from "vscode"

const execPromise = promisify(exec)

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	//register the conversion command
	let disposable = vscode.commands.registerCommand('vscode-serz.convert', async () => {

		//check if the specified serz path in the settings exists
		let serzPath = vscode.workspace.getConfiguration("vscode-serz").get<string>("serzExePath")
		if(!fs.existsSync(serzPath)) {
			let selection = await vscode.window.showErrorMessage(`Path "${serzPath}" isn't a valid serz executable path (file does not exist).`, "Open settings")
			if(selection === "Open settings") {
				vscode.commands.executeCommand("workbench.action.openSettings", "vscode-serz.serzExePath")
			}
			return
		}

		//activeTextEditor return undefined for large files (supposedly over 50MB), which means that most Tracks.xml files won't open
		let activeFile = vscode.window.activeTextEditor.document.fileName
		let fileExt = path.extname(activeFile)
		let convertedFile: string
		if(fileExt === ".bin") {
			convertedFile = activeFile.replace(/(bin)$/, "xml")
		} else {
			convertedFile = activeFile.replace(/(xml)$/, "bin")
		}

		await vscode.window.withProgress({location: vscode.ProgressLocation.Notification}, async (progress) => {
			progress.report({message: `Converting ${activeFile} to ${fileExt === ".bin" ? ".xml" : ".bin"}`})
			let {stdout, stderr} = await execPromise(`${serzPath} "${activeFile}"`)
			if(stderr.length !== 0) {
				vscode.window.showErrorMessage(`Failed to convert "${activeFile}". Error: ${stderr}`)
			} else if(!stdout.includes("Conversion complete")) {
				vscode.window.showErrorMessage(`Failed to convert "${activeFile}". Error: ${stdout}`)
			} else {
				vscode.window.showInformationMessage("Conversion complete")
			}
		})

		await vscode.commands.executeCommand("vscode.open", vscode.Uri.file(convertedFile))
	})

	context.subscriptions.push(disposable)
}

// This method is called when your extension is deactivated
export function deactivate() {}
