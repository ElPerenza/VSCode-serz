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

    //map of the extensions and their converted equivalent
    private static readonly extensionMappings = new Map<string, string>([
        ["xml", "bin"],
        ["proxyxml", "proxybin"],
        ["bin", "xml"],
        ["proxybin", "proxyxml"],
        ["GeoPcDx", "xml"],
        ["TgPcDx", "xml"],
        ["XSec", "xml"],
    ])

    //"special" bin extensions refers to binary files that are converted to a file with .xml extension instead of having a custom one (like .proxybin with .proxyxml)
    //when being converted back to binary from text, these files have to be renamed after conversion as serz.exe doesn't know how to deal with these extensions
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
     * @throws {@linkcode SerzError} if the serz executable file found in the configuration is incorrect or if the conversion process fails.
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
     * Checks if the given extension corresponds to a binary file type.
     * @param ext the extension to check
     * @returns true if binary, otherwise false
     */
    private isBinExtension(ext: string): boolean {
        return Serz.BIN_EXTENSIONS.includes(ext)
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
     * Converts the given file with serz.exe.
     * @param filePath path to the file to convert
     * @returns the path to the converted file
     */
    public async convert(filePath: string): Promise<string> {

        //get the serz.exe path from the settings
        let serzPath = workspace.getConfiguration().get<string>(this.serzPathKey) ?? ""
        //if the path set in the settings is a directory, try to search for serz inside that folder
        if((await fsp.lstat(serzPath)).isDirectory()) {
            serzPath = path.join(serzPath, "serz.exe")
        }
        if(!fs.existsSync(serzPath)) {
            throw new SerzError(SerzError.Code.SerzPathInvalid, `Path "${serzPath}" does not exist.`)
        }

        //build the converted file's path
        let fileExt = path.extname(filePath).replace(/^./, "") //strip leading dot
        let convertedExt = Serz.extensionMappings.get(fileExt)
        let convertedFilePath = filePath.replace(new RegExp(`(${fileExt})$`), convertedExt)
    
        //if the original file is a "special" bin file, store the converted file path and original extension,
        //so that it can be converted to binary from text correctly later on
        if(this.isSpecialBinExtension(fileExt)) {
            let specialBinFiles = this.context.globalState.get<Record<string, string>>(this.specialBinFilesKey)
            if(specialBinFiles !== undefined) {
                specialBinFiles[convertedFilePath] = fileExt
                this.context.globalState.update(this.specialBinFilesKey, specialBinFiles)
            }
        }
    
        //execute serz.exe and throw an error if something went wrong
        //serz usage: "/path/to/serz.exe file-to-convert.[extension] /[bin, xml]:converted-file.[extension]"
        let {stdout, stderr} = await execPromise(`"${serzPath}" "${filePath}" /${this.isBinExtension(fileExt) ? "xml" : "bin"}:"${convertedFilePath}"`)
        if(stderr.length !== 0) {
            throw new SerzError(SerzError.Code.ConversionFailed, stderr)
        } else if(!stdout.includes("Conversion complete")) {
            //serz.exe doesn't write errors to stderr but to stdout for some reason, so we treat any message not containing "Conversion complete" as an error
            throw new SerzError(SerzError.Code.ConversionFailed, stdout)
        }

        //if the converted .xml file was originally a "special" bin file, rename the freshly created .bin file to the correct extension
        let specialExt = this.context.globalState.get<Record<string, string>>(this.specialBinFilesKey)?.[filePath]
        if(specialExt !== undefined) {
            let specialFile = convertedFilePath.replace(new RegExp(`(${convertedExt})$`), specialExt)
            await fsp.rename(convertedFilePath, specialFile)
            return specialFile
        } else {
            return convertedFilePath
        }
    }
}