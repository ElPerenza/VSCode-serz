# RailWorks Serz integration for Visual Studio Code

This is an extension that integrates the serz.exe utility from the game Train Simulator Classic (also known as RailWorks) into Visual Studio Code, to convert the game `.bin` (and other related file types) files to `.xml` and vice versa directly from within the editor.  

This extension is intended as a replacement for the .bin editing capabilities of the now-defunct TS-Tools program, while also being much faster and more user friendly thanks to Visual Studio Code's superior code editing and Search and Replace features.  

![Extension demo](assets/demo.gif)

## Installation

This extension requires [Visual Studio Code 1.72.0+](https://code.visualstudio.com/) to function.  
Like any other extension, you can install it through the integrated [Extensions tab](https://code.visualstudio.com/docs/editor/extension-marketplace) in Visual Studio Code by searching for "Railworks Serz integration". Alternatively, you can also download and install it manually from the [Releases page](https://github.com/ElPerenza/VSCode-serz/releases).  

After having installed it, you need to change a couple of settings in the editor for it to work properly:
- **Serz Exe Path**: The path to the serz executable to use for conversion. The path can either point directly at the serz.exe file or at the directory it's found in.
- **Default Binary Editor**: The default editor with which to open binary files. Whilst not necessary for the extension to work, having a default editor set will save you the hassle of having to specify each time how to open a binary file. I'd recommend downloading a binary file viewer extension (Like Microsoft's [Hex Editor](https://marketplace.visualstudio.com/items?itemName=ms-vscode.hexeditor)) and setting it as the default (for MS's Hex Editor that would be `hexEditor.hexedit`). You can get away with using the default text editor (the `default` option), but be careful to never save the file, as [it will corrupt it!](https://github.com/microsoft/vscode/issues/91958)

And that's it! You can now seamlessly convert between `.bin` and `.xml` files without ever leaving the editor.

## Usage

This extension exposes two commands to convert RailWorks files:
- **Convert a file with serz** (`vscode-serz.convert`) lets you convert a .xml file to .bin and vice versa. You need to specify which file to convert yourself via the pop-up dialog. Can be invoked either via the Command Palette (open with `CTRL+SHIFT+P` or `F1`) or via the keyboard shortcut `SHIFT+ALT+Q`.
- **Convert current file with serz** (`vscode-serz.convertCurrent`) converts the currently focused file. This command requires no user input and can be invoked via che Command Palette, the keyboard shortcut `ALT+Q` or by the explorer, editor and editor title context menus.  
Because of restrictions imposed by the editor, this command won't function when invoked via the Command Palette or keyboard shortcut when working with files that are larger than 50MB. Invoking the command from one of the context menus works even with large files.

### Supported file types:
- `.bin`, `.proxybin`, `.GeoPcDx`, `.TgPcDx`, `.XSec` for binary files
- `.xml`, `.proxyxml` for text files

### GeoPcDx, TgPcDx and XSec files support
These binary file extensions behave slightly differently from the other ones: since they get converted to an .xml file by serz.exe, when get converted back they default to .bin and have to be renamed to the correct extension after conversion. The extension can automatically do this renaming process, however only if the binary file was previously converted by the extension (doesn't matter if in the current session or a previous one), as this lets the extension know what do do with the converted text file in case of the reverse conversion taking place. In other cases, you must rename the file yourself.

## Feedback, Bugs and Contributing

Do you have a question, an idea on how to make this extension better or have you found a bug? [Open an issue](https://github.com/ElPerenza/VSCode-serz/issues) where we can discuss!

If you want to help with the development of this extension, here is some more technical information on the project:

### Environment setup

To develop this extension, you need VSCode 1.72.0+. Before you can start developing, create a `config.ts` file in `src/test/suite` and put this inside it:
```ts
export default {
    folder: "/path/to/test-assets" //this MUST be absolute
}
```
This file is used by the test code to determine where the `test-assets/` directory can be found.

### Running and Debugging

The default `Run Extension` and `Extension Tests` launch configurations are used for this extension. You can execute them from the "Run" tab in the Activity Bar.

### VSCode contributes

This extension contributes 2 commands (`vscode-serz.convert` and `vscode-serz.convertCurrent`) and 1 configuration setting (`vscode-serz.serzExePath`). For a description of their purpose check out the "Installation" and "Usage" sections of this readme.

### Structure

- `.vscode/`: contains the VSCode launch configurations, tasks and settings
- `assets/`: contains the extension logo and the demo gif used in this readme.
- `src/`: contains the extension code and tests.
- `src/extension.ts`: contains the extension entry point.
- `src/test/suite/extension.test.ts`: contains the extension tests, written with Mocha.
- `test-assets/`: contains the .bin and .xml files used for testing.
- `package.json`: contains the extension properties and contributes definitions