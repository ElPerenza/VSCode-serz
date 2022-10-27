# RailWorks Serz integration for Visual Studio Code

> More detailed information on this extension can be found in the [wiki](https://github.com/ElPerenza/VSCode-serz/wiki).

This is an extension that integrates the serz.exe utility from the game Train Simulator Classic (also known as RailWorks) into Visual Studio Code, to convert the game `.bin` files to `.xml` and vice versa directly from within the editor.  

This extension is intended as a replacement for the .bin editing capabilities of the now-defunct TS-Tools program, while also being much faster and more user freindly thanks to Visual Studio Code's superior code editing and Search and Replace features.  

![Extension demo](assets/demo.gif)

## Installation

This extension requires [Visual Studio Code 1.72.0+](https://code.visualstudio.com/) to function.  
Like any other extension, you can install it through the integrated [Extensions tab](https://code.visualstudio.com/docs/editor/extension-marketplace) in Visual Studio Code by searching for "Railworks Serz integration". Alternatively, you can also download and install it manually from the [Releases page](https://github.com/ElPerenza/VSCode-serz/releases).  

After having installed it, you need to change a copule of settings in the editor for it to work properly:
- **Serz Exe Path**: The path to the serz executable to use for conversion. The path can either point directly at the serz.exe file or at the directory it's found in.
- **Default Binary Editor**: The default editor with which to open binary files. Whilst not necessary for the extension to work, setting this to `default` will save you the hassle of having to specify each time how to open a binary file (like the .bin files used by RailWorks) in the editor.  

And that's it! You can now seamlessly convert between `.bin` and `.xml` files without ever leaving the editor.

## Usage

This extension exposes two commands to convert RailWorks files:
- **Convert a file with serz** (`vscode-serz.convert`) lets you convert a .xml file to .bin and vice versa. You need to specify which file to convert yourself via the pop-up dialog. Can be invoked wither via the Command Palette (open with `CTRL+SHIFT+P`) or via the keyboard shortcut `SHIFT+ALT+Q`.
- **Convert current file with serz** (`vscode-serz.convertCurrent`) converts the currently focused file. This command requires no user input and can be invoked via che Command Palette, the keyboard shortcut `ALT+Q` or by right clicking on the file you want to convert and selecting "Convert current file with serz" from the opened menu.  
Because of restrictions imposed by the editor, this command won't work with files that are larger than 50MB. If you need to convert large files, use the `convert` command.