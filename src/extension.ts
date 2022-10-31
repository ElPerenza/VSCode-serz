import { exec } from "child_process"
import * as fs from "fs"
import * as fsp from "fs/promises"
import * as path from "path"
import { promisify } from "util"
import * as vscode from "vscode"
const execPromise = promisify(exec)

//"special" bin extensions refers to binary files that are converted to a file with .xml extension instead of having a custom one (like .proxybin with .proxyxml)
//when being converted back to binary from text, these files have to be renamed after conversion as serz.exe doesn't know how to deal with these extensions
const specialBinExtensions = ["GeoPcDx", "TgPcDx", "XSec"]
//supported extensions for conversion
const xmlExtensions = ["xml", "proxyxml"]
const binExtensions = ["bin", "proxybin", ...specialBinExtensions]
const allExtensions = [...xmlExtensions, ...binExtensions]
const addDot = (extension: string) => `.${extension}`

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	vscode.commands.executeCommand("setContext", "vscode-serz.supportedFiles", allExtensions.map(addDot))

	//vscode-serz.specialBinFiles stores which converted .xml files were originally "special" bin files and which extension they had, so that they can be correctly converted back
	if(context.globalState.get("vscode-serz.specialBinFiles") === undefined) {
		context.globalState.update("vscode-serz.specialBinFiles", {})
	}

	//the "convert" command converts a file chosen arbitrarily by the user
	let cmdConvert = vscode.commands.registerCommand("vscode-serz.convert", async () => {
		//prompt the user to select a file to convert
		let selectedFile = await vscode.window.showOpenDialog({
			openLabel: "Convert",
			title: "Select the file to convert",
			canSelectFiles: true,
			canSelectFolders: false,
			canSelectMany: false,
			filters: {
				"Compatible files": allExtensions,
				"XML files": xmlExtensions,
				"BIN files": binExtensions,
				"All files": ["*"]
			}
		})
		if(selectedFile !== undefined) {
			await convertThenOpen(selectedFile[0].fsPath, context)
		}
	})

	//the "convertCurrent" command converts the currently open file
	let cmdConvertCurrent = vscode.commands.registerCommand("vscode-serz.convertCurrent", async () => {
		let activeFilePath = vscode.window.activeTextEditor?.document.fileName
		//for files bigger than 50MB activeTextEditor is undefined. As such, this command won't work, so direct the user to the "convert" command, which explicitly asks for the file to convert
		if(activeFilePath === undefined) {
			let selection = await vscode.window.showWarningMessage("It seems like you're currently trying to convert a file that is bigger than 50MB. " + 
																"Due to VSCode's technical limitations, you need to explicitly tell which file you want to convert", "Choose file")
			if(selection === "Choose file") {
				vscode.commands.executeCommand("vscode-serz.convert")
			}
			return
		}
		await convertThenOpen(activeFilePath, context)
	})

	context.subscriptions.push(cmdConvert, cmdConvertCurrent)
}

// This method is called when your extension is deactivated
export function deactivate() {}

//map of the extensions and their converted equivalent
const extensionMappings = new Map<string, string>([
	["xml", "bin"],
	["proxyxml", "proxybin"],
	["bin", "xml"],
	["proxybin", "proxyxml"],
	["GeoPcDx", "xml"],
	["TgPcDx", "xml"],
	["XSec", "xml"],
])

/**
 * Checks if the given extension corresponds to a binary file type.
 * @param ext the extension to check
 * @returns true if binary, otherwise false
 */
 function isBinExtension(ext: string): boolean {
	return binExtensions.includes(ext)
}

/**
 * Checks if the given extension corresponds to a "special" binary file type.
 * @param ext the extension to check
 * @returns true if binary, otherwise false
 */
function isSpecialBinExtension(ext: string): boolean {
	return specialBinExtensions.includes(ext)
}

/**
 * Uses serz.exe to convert the given file .bin -> .xml or vice versa, then opens the converted file in the editor.
 * @param filePath the path pointing to the file to convert
 * @param context the current extension context
 */
async function convertThenOpen(filePath: string, context: vscode.ExtensionContext): Promise<void> {

	//get the serz.exe path from the settings
	let serzPath = vscode.workspace.getConfiguration("vscode-serz").get<string>("serzExePath") ?? ""
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
	let fileExt = path.extname(filePath).replace(/^./, "")
	let convertedExt = extensionMappings.get(fileExt)
	let convertedFile = filePath.replace(new RegExp(`(${fileExt})$`), convertedExt)

	//store the converted file path and original extension so that it can be converted text --> binary correctly later
	if(isSpecialBinExtension(fileExt)) {
		let specialBinFiles = context.globalState.get<Record<string, string>>("vscode-serz.specialBinFiles")
		if(specialBinFiles !== undefined) {
			specialBinFiles[convertedFile] = fileExt
			context.globalState.update("vscode-serz.specialBinFiles", specialBinFiles)
		}
	}

	//convert the file with serz.exe
	try {
		await vscode.window.withProgress({location: vscode.ProgressLocation.Notification}, async (progress) => {
			progress.report({message: `Converting ${filePath} to .${convertedExt}`})

			//execute serz.exe and throw an error if something went wrong
			//serz usage: "/path/to/serz.exe file-to-convert.[extension] /[bin, xml]:converted-file.[extension]"
			let {stdout, stderr} = await execPromise(`"${serzPath}" "${filePath}" /${isBinExtension(fileExt) ? "xml" : "bin"}:"${convertedFile}"`)
			if(stderr.length !== 0) {
				throw new Error(stderr)
			} else if(!stdout.includes("Conversion complete")) {
				//serz.exe doesn't write errors to stderr but to stdout for some reason, so we treat any message not containing "Conversion complete" as an error
				throw new Error(stdout)
			}

			let specialExt = context.globalState.get<Record<string, string>>("vscode-serz.specialBinFiles")?.[filePath]
			//if the converted .xml file was originally a "special" bin file (if specialExt is not undefined), rename the converted .bin file to the correct extension
			if(specialExt !== undefined) {
				let specialFile = convertedFile.replace(new RegExp(`(${convertedExt})$`), specialExt)
				await fsp.rename(convertedFile, specialFile)
				convertedFile = specialFile
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
