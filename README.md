# Enhanced Working Diffs

This VS Code extension enhances your workflow by displaying inline Git diff decorations directly in your text editor, making it easy to see changes in your working files.

## Features

* **Inline Git Diff Highlighting:** Visualize changes directly within your editor window. Added lines are subtly highlighted with a green border, modified lines with an orange border, and deleted lines are indicated with a dashed red border and inline deleted text.
* **Toggleable Decorations:** Easily toggle the inline diff decorations on or off using a command or status bar item.
* **Status Bar Item:** A convenient status bar item in the bottom right corner allows for quick toggling of the diff decorations.
* **Keyboard Shortcut:** Use `Ctrl+Alt+M` (or `Cmd+Alt+M` on macOS) to quickly toggle the inline diff decorations while focusing on the editor.
* **Real-time Updates:** Diff decorations are updated automatically as you edit your document, providing immediate feedback on your changes.
* **Subtle and Non-Intrusive:** Decorations are designed to be subtle, using borders and background colors that don't distract from your code, but clearly highlight changes.

**Example of Inline Diff Highlighting:**

*(Ideally, you would include a screenshot or animation here showing the inline diffs in action)*

## Requirements

*  Requires Git to be installed and accessible in your system's PATH.
*  The opened file must be part of a Git repository and tracked by Git to display diff information.

## Extension Usage

1. **Installation:** Install the "enhanced-working-diffs" extension from the VS Code Marketplace.
2. **Activation:** The extension activates automatically on startup and when you open a file within a Git repository.
3. **Toggle Diff Decorations:**
    * **Command Palette:** Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and type `Toggle Inline Working Diff`.
    * **Status Bar:** Click the "$(diff) Toggle Diff" item in the status bar (usually on the bottom right).
    * **Keyboard Shortcut:** Press `Ctrl+Alt+M` (or `Cmd+Alt+M` on macOS) when the editor is focused.

4. **Automatic Updates:** As you modify files in your workspace, the inline diff decorations will update automatically after a short delay to reflect the latest changes detected by Git.

## Known Issues

*  Currently, the extension relies on VS Code's built-in Git API. Complex diff scenarios or custom Git configurations might not be fully supported.
*  Performance on very large files with extensive changes might be slightly impacted.

## Release Notes

### 0.0.6

Major update to Enhanced Working Diffs:
* Removed dependency on simple-git library
* Now uses VS Code's native Git API for better integration
* Added basic tests for the extension
* Improved code organization and maintainability

### 0.0.1

Initial release of Enhanced Working Diffs:
* Provides inline Git diff highlighting for added, modified, and deleted lines.
* Includes a command, status bar item, and keybinding to toggle decorations.
* Offers real-time updates as you edit files.

---

## Following extension guidelines

This extension adheres to VS Code extension guidelines to provide a seamless and efficient user experience.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## For more information

* [Visual Studio Code's Extension API](https://code.visualstudio.com/api)
* [VS Code Git Extension API](https://github.com/microsoft/vscode/blob/main/extensions/git/src/api/git.d.ts)

**Enjoy enhanced diff visibility in your daily coding!**
