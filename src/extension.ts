import { commands, ExtensionContext, ProgressLocation, Uri, window } from "vscode"
import Serz from "./serz"
import SerzError from "./serzError"

const serzPathKey = "vscode-serz.serzExePath"
const specialBinFilesKey = "vscode-serz.specialBinFiles"

/**
 * Function called when the extension gets activated.
 * @param context the extension context
 */
export function activate(context: ExtensionContext) {

	commands.executeCommand("setContext", "vscode-serz.supportedFiles", Serz.ALL_EXTENSIONS.map(ext => `.${ext}`))

	const serz = new Serz(context, serzPathKey, specialBinFilesKey)

	//the "convert" command converts a file chosen arbitrarily by the user
	let cmdConvert = commands.registerCommand("vscode-serz.convert", async () => {
		//prompt the user to select a file to convert
		let selectedFile = await window.showOpenDialog({
			openLabel: "Convert",
			title: "Select the file to convert",
			canSelectFiles: true,
			canSelectFolders: false,
			canSelectMany: false,
			filters: {
				"Compatible files": Serz.ALL_EXTENSIONS,
				"XML files": Serz.XML_EXTENSIONS,
				"BIN files": Serz.BIN_EXTENSIONS,
				"All files": ["*"]
			}
		})
		if(selectedFile !== undefined) {
			await convertThenOpen(serz, selectedFile[0].fsPath)
		}
	})

	//the "convertCurrent" command converts the currently open file
	let cmdConvertCurrent = commands.registerCommand("vscode-serz.convertCurrent", async () => {
		let activeFilePath = window.activeTextEditor?.document.fileName
		//for files bigger than 50MB activeTextEditor is undefined. As such, this command won't work, so direct the user to the "convert" command, which explicitly asks for the file to convert
		if(activeFilePath === undefined) {
			let selection = await window.showWarningMessage("It seems like you're currently trying to convert a file that is bigger than 50MB. " + 
																"Due to VSCode's technical limitations, you need to explicitly tell which file you want to convert", "Choose file")
			if(selection === "Choose file") {
				commands.executeCommand("vscode-serz.convert")
			}
			return
		}
		await convertThenOpen(serz, activeFilePath)
	})

	context.subscriptions.push(cmdConvert, cmdConvertCurrent)
}

/**
 * Function called when the extension gets deactivated.
 */
export function deactivate() {}

/**
 * Converts the given file with the serz.exe utility, then opens the converted file in the editor.
 * @param serz the instance of the Serz class to use for conversion
 * @param filePath the path pointing to the file to convert
 */
async function convertThenOpen(serz: Serz, filePath: string): Promise<void> {
	try {

		let convertedFilePath = await window.withProgress({location: ProgressLocation.Notification}, async (progress) => {
			progress.report({message: `Converting "${filePath}"...`})
			return await serz.convert(filePath)
		})
		window.showInformationMessage("Conversion complete")
		//use this way to open files instead of vscode.workspace.openTextDocument because this method has no 50MB size limit like openTextDocument, 
		//which is quite easy to exceed when working with RailWorks .xml files
		await commands.executeCommand("vscode.open", Uri.file(convertedFilePath))

	} catch(error) {
		if(error instanceof SerzError) {
			switch(error.errorCode) {

				//if the serz.exe path in the configuration is invalid, give the user the option to directly open settings to change it
				case SerzError.Code.SerzPathInvalid:
					let selection = await window.showErrorMessage(`Invalid serz executable path: ${error.message}`, "Open settings")
					if(selection === "Open settings") {
						commands.executeCommand("workbench.action.openSettings", "vscode-serz.serzExePath")
					}
					break

				case SerzError.Code.ConversionFailed:
					window.showErrorMessage(`Failed to convert ${filePath}: ${error.message}`)
					break
			}
		}
	}
}
