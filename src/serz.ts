import { exec } from "child_process"
import * as fs from "fs"
import * as fsp from "fs/promises"
import * as path from "path"
import { promisify } from "util"
import { ExtensionContext, workspace } from "vscode"
import SerzError from "./serzError"
const execPromise = promisify(exec)

/**
 * Class that can be used to programmatically invoke the serz.exe utility to convert files.
 */
export default class Serz {

    /**
     * Map of the extensions and their converted equivalent.
     */
    private static readonly extensionMappings = new Map<string, string>([
        ["xml", "bin"],
        ["proxyxml", "proxybin"],
        ["bin", "xml"],
        ["proxybin", "proxyxml"],
        ["GeoPcDx", "xml"],
        ["TgPcDx", "xml"],
        ["XSec", "xml"],
    ])
    /**
     * "Special" bin extensions refers to binary files that are converted to a file with .xml extension instead of having a custom one (like .proxybin with .proxyxml).
     * When being converted back to binary from text, these files have to be renamed after conversion as serz.exe doesn't know how to deal with these extensions.
     */
    private static readonly specialBinExtensions = ["GeoPcDx", "TgPcDx", "XSec"]

    /**
     * Text file extensions supported by serz.
     */
    public static readonly XML_EXTENSIONS = ["xml", "proxyxml"]
    /**
     * Binary file extensions supported by serz.
     */
    public static readonly BIN_EXTENSIONS = ["bin", "proxybin", ...Serz.specialBinExtensions]
    /**
     * All of the file extensions supported by serz.
     */
    public static readonly ALL_EXTENSIONS = [...Serz.XML_EXTENSIONS, ...Serz.BIN_EXTENSIONS]

    /**
     * Instantiates a new `Serz` object configured with the given parameters.
     * @param context the context of the executing extension
     * @param serzPathKey the `WorkspaceConfiguration` key where the path to the serz executable is stored
     * @param specialBinFilesKey the `context.globalState` key where to store the mappings for converting GeoPcDx, TgPcDx and XSec files
     */
    public constructor(
        private readonly context: ExtensionContext, 
        private readonly serzPathKey: string, 
        private readonly specialBinFilesKey: string
    ) {
        if(context.globalState.get(specialBinFilesKey) === undefined) {
            context.globalState.update(specialBinFilesKey, {})
        }
    }

    /**
     * Checks if the given file is a binary file.
     * @param ext the file name to check
     * @returns true if binary, otherwise false
     */
    public static isBinFile(fileName: string): boolean {
        let fileExt = path.extname(fileName).replace(/^./, "")
        return Serz.BIN_EXTENSIONS.includes(fileExt)
    }

    /**
     * Checks if the given extension corresponds to a "special" binary file type.
     * @param ext the extension to check
     * @returns true if binary, otherwise false
     */
    private isSpecialBinExtension(ext: string): boolean {
        return Serz.specialBinExtensions.includes(ext)
    }

    /**
     * Retrieves the mappings for "special" binary files from the global state.
     * @returns the mappings between converted special bin file paths and their original extension
     */
    private getSpecialBinFiles(): Record<string, string> {
        return this.context.globalState.get(this.specialBinFilesKey)
    }

    /**
     * Updates the mappings for "special" binary files in the global state.
     * @param value the updated mappings between converted special bin file paths and their original extension
     */
    private updateSpecialBinFiles(value: Record<string, string>): void {
        this.context.globalState.update(this.specialBinFilesKey, value)
    }

    /**
     * Retrieves the serz executable path found in the configuration and checks if it exists.
     * If the path points to a directory, the method searches for serz.exe inside that directory.
     * @returns absolute path to the serz executable
     * @throws {@linkcode SerzError} if the path to serz found in the configuration doesn't exist
     */
    private getSerzPath(): string {

        let serzPath = workspace.getConfiguration().get<string>(this.serzPathKey) ?? ""
        if(!fs.existsSync(serzPath)) {
            throw new SerzError(SerzError.Code.SerzPathInvalid, `Path "${serzPath}" does not exist.`)
        }

        if(fs.lstatSync(serzPath).isDirectory()) {
            serzPath = path.join(serzPath, "serz.exe")
            if(!fs.existsSync(serzPath)) {
                throw new SerzError(SerzError.Code.SerzPathInvalid, `Path "${serzPath}" does not exist.`)
            }
        }

        return serzPath
    }

    /**
     * Converts the given file with serz.exe.
     * @param filePath path to the file to convert
     * @returns the path to the converted file
     * @throws {@linkcode SerzError} if the serz executable file found in the configuration is incorrect or if the conversion process fails
     */
    public async convert(filePath: string): Promise<string> {

        //build the converted file's path
        let fileExt = path.extname(filePath).replace(/^./, "")
        let convertedExt = Serz.extensionMappings.get(fileExt)
        let convertedFilePath = filePath.replace(new RegExp(`(${fileExt})$`), convertedExt)
    
        //if the original file is a "special" bin file, store the converted file path and original extension,
        //so that it can be converted to binary from text correctly later on
        if(this.isSpecialBinExtension(fileExt)) {
            let specialBinFiles = this.getSpecialBinFiles()
            if(specialBinFiles !== undefined) {
                specialBinFiles[convertedFilePath] = fileExt
                this.updateSpecialBinFiles(specialBinFiles)
            }
        }
    
        //execute serz.exe
        //serz usage: "/path/to/serz.exe file-to-convert.[extension] /[bin, xml]:converted-file.[extension]"
        let {stdout, stderr} = await execPromise(`"${this.getSerzPath()}" "${filePath}" /${Serz.isBinFile(filePath) ? "xml" : "bin"}:"${convertedFilePath}"`)
        if(stderr.length !== 0) {
            throw new SerzError(SerzError.Code.ConversionFailed, stderr)
        } else if(!stdout.includes("Conversion complete")) {
            //serz.exe doesn't write errors to stderr but to stdout for some reason, so we treat any message not containing "Conversion complete" as an error
            throw new SerzError(SerzError.Code.ConversionFailed, stdout)
        }

        //if the converted .xml file was originally a "special" bin file, rename the freshly created .bin file to the correct extension
        let specialExt = this.getSpecialBinFiles()?.[filePath]
        if(specialExt !== undefined) {
            let specialFilePath = convertedFilePath.replace(new RegExp(`(${convertedExt})$`), specialExt)
            await fsp.rename(convertedFilePath, specialFilePath)
            return specialFilePath
        } else {
            return convertedFilePath
        }
    }
}