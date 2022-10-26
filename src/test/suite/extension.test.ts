import * as assert from "assert"
import testConfig from "./config"
import * as fs from "fs"
import * as vscode from "vscode"

describe("VSCode-serz tests", () => {
	vscode.window.showInformationMessage("Start all tests.")

	//the converted files created by serz.exe during testing
	const convertedXmlTest = `${testConfig.folder}/xml-test.bin`
	const convertedBinTest = `${testConfig.folder}/bin-test.xml`

	it("Can convert an XML file", async () => {

		let xmlDoc = await vscode.workspace.openTextDocument(`${testConfig.folder}/xml-test.xml`)
		await vscode.window.showTextDocument(xmlDoc, vscode.ViewColumn.Active, false)
		await vscode.commands.executeCommand("vscode-serz.convertCurrent")
		//check that the converted file exists and is the currently active document
		assert(fs.existsSync(convertedXmlTest))
		assert.strictEqual(vscode.window.activeTextEditor.document.fileName, vscode.Uri.file(convertedXmlTest).fsPath)
	})

	it("Can convert a BIN file", (done) => {

		let disposable = vscode.window.onDidChangeActiveTextEditor(async () => {

			//when opening a binary file and setting it as the active document, the activeTextDocument property briefly transitions to undefined before being set to the binary document
			if(vscode.window.activeTextEditor === undefined) {
				return
			}
			disposable.dispose()

			await vscode.commands.executeCommand("vscode-serz.convertCurrent")
			//check that the converted file exists and is the currently active document
			assert(fs.existsSync(convertedBinTest))
			assert.strictEqual(vscode.window.activeTextEditor.document.fileName, vscode.Uri.file(convertedBinTest).fsPath)
			done() //tells Mocha that the test has finished when having an async callback in the test
		})

		//workspace.openTextDocument doesn't work with .bin files so we need to use this
		//also awaiting this promise still leaves activeTextEditor as undefined, so we use the onDidChangeActiveTextEditor callback above to check when the .bin file becomes active
		vscode.commands.executeCommand("vscode.open", vscode.Uri.file(`${testConfig.folder}/bin-test.bin`))
	})

	after(async () => {
		//remove the unnecessary files created during testing
		fs.rmSync(convertedXmlTest, {force: true})
		fs.rmSync(convertedBinTest, {force: true})
		//close the 4 opened files in the editor
		for(let i=0; i<4; i++) {
			await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
		}
	})
})
