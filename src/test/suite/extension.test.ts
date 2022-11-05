import assert from "assert"
import testConfig from "./config"
import fs from "fs"
import vscode from "vscode"
import Serz from "../../serz"

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Test that the extension can correctly convert the given file to a file pointing to the converted file URI.
 * @param originalFileUri the URI pointing to the file to convert
 * @param convertedFileUri the URI pointing to the converted file
 */
async function testConversion(originalFileUri: vscode.Uri, convertedFileUri: vscode.Uri): Promise<void> {
	await vscode.commands.executeCommand("vscode-serz.convertCurrent", originalFileUri)
	await sleep(1000)
	//check that the converted file exists and, if it's a text file, is the currently active document
	assert(fs.existsSync(convertedFileUri.fsPath))
	if(!Serz.isBinFile(convertedFileUri.fsPath)) {
		assert.strictEqual(vscode.window.activeTextEditor?.document.fileName, convertedFileUri.fsPath)
	}
}

describe("VSCode-serz tests", () => {
	vscode.window.showInformationMessage("Start all tests.")

	//the converted files created by serz.exe during testing
	const convertedXmlTest = vscode.Uri.file(`${testConfig.folder}/xml-test.bin`)
	const convertedBinTest = vscode.Uri.file(`${testConfig.folder}/bin-test.xml`)
	const convertedGeoTest = vscode.Uri.file(`${testConfig.folder}/geo-test.xml`)

	it("Can convert an XML file", async () => {
		await testConversion(vscode.Uri.file(`${testConfig.folder}/xml-test.xml`), convertedXmlTest)
	})

	it("Can convert a BIN file", async () => {
		await testConversion(vscode.Uri.file(`${testConfig.folder}/bin-test.bin`), convertedBinTest)
	})

	it("Can convert a GeoPcDx file", async () => {
		const originalGeoTest = vscode.Uri.file(`${testConfig.folder}/geo-test.GeoPcDx`)
		//first convert the geo file to xml (so that the extension knows that it's a geo), then convert it back
		await testConversion(originalGeoTest, convertedGeoTest)
		await testConversion(convertedGeoTest, originalGeoTest)
	})

	after(async () => {
		//remove the unnecessary files created during testing
		fs.rmSync(convertedXmlTest.fsPath, {force: true})
		fs.rmSync(convertedBinTest.fsPath, {force: true})
		fs.rmSync(convertedGeoTest.fsPath, {force: true})
		//close the 6 opened files in the editor
		for(let i=0; i<6; i++) {
			await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
		}
	})
})
