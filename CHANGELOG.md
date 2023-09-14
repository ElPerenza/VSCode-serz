# Change Log

All notable changes to this extension will be documented in this file.

## [1.2.1] - 2023-09-15
### Changed
- Have better error messages when command execution fails during conversion to help with debugging.

## [1.2.0] - 2022-11-05
### Added
- The `convertCurrent` command can now also be invoked from the file explorer and editor title context menus.
### Changed
- Now >50Mb files can be converted with the `convertCurrent` command if it is invoked from a menu. Invoking it with the keybind or from the command palette still doesn't work.
- When converting a file, now the converted file will be focused after opening only if it's a text file: binary files will be opened in a background tab.
- README now recommends using a binary editor over the default text editor when opening binary files.
### Fixed
- Fix bug that would make conversion fail silently when the serz path was a nonexistent directory.

## [1.1.0] - 2022-10-31
### Added
- Support for `.GeoPcDx`, `.TgPcDx` and `.XSec` files

## [1.0.1] - 2022-10-30
### Fixed
- `.proxyxml` files now open in the editor after conversion

## [1.0.0] - 2022-10-30
- Initial public release
### Added
- Support for `.proxyxml` and `.proxybin` files

## [0.1.1] - 2022-10-30
### Fixed
- Path to the serz executable can now contain spaces in file/folder names

## [0.1.0] - 2022-10-27
- Initial release
