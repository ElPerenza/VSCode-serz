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
		await convertThenOpen(vscode.window.activeTextEditor.document.fileName)
	})

	context.subscriptions.push(disposable)
}

// This method is called when your extension is deactivated
export function deactivate() {}

/**
 * Uses serz.exe to convert the given file .bin -> .xml or vice versa, then opens the converted file in the editor.
 * @param filePath the path pointing to the file to convert
 */
async function convertThenOpen(filePath: string): Promise<void> {
	
	//get the serz.exe path from the settings
	let serzPath = vscode.workspace.getConfiguration("vscode-serz").get<string>("serzExePath")
	//if the path set in the settings is a directory, try to search for serz inside that folder
	if(fs.lstatSync(serzPath).isDirectory()) {
		serzPath = path.join(serzPath, "serz.exe")
	}
	//check if serz exists and, if it's invalid, give the user an option to directly open settings to change it
	if(!fs.existsSync(serzPath)) {
		let selection = await vscode.window.showErrorMessage(`Path "${serzPath}" isn't a valid serz executable path (file does not exist).`, "Open settings")
		if(selection === "Open settings") {
			vscode.commands.executeCommand("workbench.action.openSettings", "vscode-serz.serzExePath")
		}
		return
	}

	//build the converted file's path
	let fileExt = path.extname(filePath)
	let convertedFile: string
	if(fileExt === ".bin") {
		convertedFile = filePath.replace(/(bin)$/, "xml")
	} else {
		convertedFile = filePath.replace(/(xml)$/, "bin")
	}

	//convert the file with serz.exe
	try {
		await vscode.window.withProgress({location: vscode.ProgressLocation.Notification}, async (progress) => {
			progress.report({message: `Converting ${filePath} to ${fileExt === ".bin" ? ".xml" : ".bin"}`})
			//execute serz.exe and throw an error if something went wrong
			//serz usage: "/path/to/serz.exe file-to-convert.[bin, xml]"
			let {stdout, stderr} = await execPromise(`${serzPath} "${filePath}"`)
			if(stderr.length !== 0) {
				throw new Error(stderr)
			} else if(!stdout.includes("Conversion complete")) {
				//serz.exe doesn't write errors to stderr but to stdout for some reason, so we treat any message not containing "Conversion complete" as an error
				throw new Error(stdout)
			}
		})
	} catch(error) {
		vscode.window.showErrorMessage(`Failed to convert ${filePath}: ${(error as Error).message}`)
		return
	}

	vscode.window.showInformationMessage("Conversion complete")
	//use this way to open files instead of vscode.workspace.openTextDocument because this method has no 50MB size limit like openTextDocument, 
	//which is quite easy to exceed when working with RailWorks .xml files
	await vscode.commands.executeCommand("vscode.open", vscode.Uri.file(convertedFile))
}