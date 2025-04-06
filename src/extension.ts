import * as vscode from 'vscode';
import { GitService } from './gitService';
import { parseGitDiff } from './diffParser';
import { DecorationManager } from './decorations/decorationManager';
import { DiffDecorationProvider, DiffCalculationResult } from './decorations/diffDecorationProvider'; // Import result type
// Removed CodeLens provider import

// Track whether inline diff decorations are currently shown
let inlineDiffDecorationEnabled = false;

// Instantiate the services and managers
const gitService = new GitService();
const decorationManager = new DecorationManager(); // Manages standard decorations
const diffDecorationProvider = new DiffDecorationProvider();
// Removed CodeLens provider instantiation

// Store the dynamically created deleted line decorations per editor to dispose them
let activeDeletedLineDecorations: Map<vscode.TextEditor, vscode.TextEditorDecorationType[]> = new Map();

export function activate(context: vscode.ExtensionContext) {
    // Register the toggle command
    const toggleCommand = vscode.commands.registerCommand('enhanced-working-diffs.toggleInlineDiff', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active editor found');
            return;
        }

        // Toggle the decorations
        if (inlineDiffDecorationEnabled) {
            clearAllEditorDecorations(); // Clear standard and deleted line decorations
            inlineDiffDecorationEnabled = false;
            vscode.window.showInformationMessage('Inline diff decorations removed');
        } else {
            await showDiffForEditor(editor);
            inlineDiffDecorationEnabled = true;
            vscode.window.showInformationMessage('Inline diff decorations applied');
        }
    });

    // Status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(diff) Toggle Diff";
    statusBarItem.tooltip = "Toggle inline diff highlighting";
    statusBarItem.command = 'enhanced-working-diffs.toggleInlineDiff';
    statusBarItem.show();

    // Update diffs when document changes (if enabled)
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(async (event) => {
        if (inlineDiffDecorationEnabled) {
            const editor = vscode.window.activeTextEditor;
            if (editor && event.document === editor.document) {
                if (updateTimeout) clearTimeout(updateTimeout);
                updateTimeout = setTimeout(async () => {
                    await showDiffForEditor(editor);
                }, 500);
            }
        }
    });

    // Update diffs when the active editor changes (if enabled)
    const changeActiveEditorSubscription = vscode.window.onDidChangeActiveTextEditor(async editor => {
        if (inlineDiffDecorationEnabled && editor) {
             if (updateTimeout) {
                 clearTimeout(updateTimeout);
                 updateTimeout = null;
             }
            await showDiffForEditor(editor);
        }
    });

    // Clear decorations if the feature is disabled when an editor closes
    const closeTextDocumentSubscription = vscode.workspace.onDidCloseTextDocument(document => {
        const editor = vscode.window.visibleTextEditors.find(e => e.document === document);
        if (editor) {
            clearDecorationsForEditor(editor); // Clear specific editor
        }
    });

    // Removed CodeLens provider registration
    // Removed CodeLens command registration

    context.subscriptions.push(
        toggleCommand,
        statusBarItem,
        changeDocumentSubscription,
        changeActiveEditorSubscription,
        closeTextDocumentSubscription,
        // Ensure manager is disposed on extension deactivation
        { dispose: () => {
            decorationManager.dispose();
            // Dispose any remaining dynamic decorations
            clearAllDeletedLineDecorations();
            }
        }
    );
}

// Debounce timer variable
let updateTimeout: NodeJS.Timeout | null = null;

/** Clears dynamic deleted line decorations for a specific editor */
function clearDeletedDecorationsForEditor(editor: vscode.TextEditor) {
    const decorations = activeDeletedLineDecorations.get(editor);
    if (decorations) {
        decorations.forEach(d => d.dispose());
        activeDeletedLineDecorations.delete(editor);
    }
}

/** Clears all dynamic deleted line decorations */
function clearAllDeletedLineDecorations() {
     activeDeletedLineDecorations.forEach(decorations => {
         decorations.forEach(d => d.dispose());
     });
     activeDeletedLineDecorations.clear();
}

/** Clears all decorations (standard and dynamic) for a specific editor */
function clearDecorationsForEditor(editor: vscode.TextEditor) {
    decorationManager.clearDecorations(editor);
    clearDeletedDecorationsForEditor(editor);
}


/** Clears all decorations (standard and dynamic) globally */
function clearAllEditorDecorations() {
    decorationManager.clearAllDecorations();
    clearAllDeletedLineDecorations();
    // Removed CodeLens clearing
}

/**
 * Fetches, parses, calculates, and applies git diff decorations for a specific editor.
 */
async function showDiffForEditor(editor: vscode.TextEditor) {
    const document = editor.document;
    const filePath = document.uri.fsPath;

    // Clear previous decorations first
    clearDecorationsForEditor(editor);
    const currentDeletedDecorations: vscode.TextEditorDecorationType[] = []; // Track new ones for this run

    try {
        // 1. Get file status
        const fileStatus = await gitService.getFileStatus(filePath);
        if (!fileStatus || !fileStatus.isModified) {
            return; // No changes or not in repo
        }

        // 2. Get the diff
        const diffOutput = await gitService.getDiff(filePath);
        if (!diffOutput) return; // No diff content

        // 3. Parse the diff
        const parsedDiff = parseGitDiff(diffOutput);
        if (!parsedDiff || parsedDiff.hunks.length === 0) return; // No changes found

        // 4. Calculate decoration options & inline deleted info
        // Destructure the result correctly
        const { decorationOptions, inlineDeletedLineOptions } = diffDecorationProvider.calculateDecorations(parsedDiff, editor);

        // 5. Apply standard decorations via the manager
        decorationManager.applyDecorations(editor, decorationOptions);

        // 6. Apply inline deleted line decorations dynamically
        for (const options of inlineDeletedLineOptions) {
            // Create a new decoration type for each specific deleted line's style/content
            // This is inefficient but necessary if renderOptions differ or need unique disposal
            const deletedLineDecoration = vscode.window.createTextEditorDecorationType({
                 isWholeLine: true, // Apply to the line the range is on
                 rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen,
                 after: options.renderOptions?.after // Get the 'after' options calculated by the provider
            });
            currentDeletedDecorations.push(deletedLineDecoration); // Track for disposal
            editor.setDecorations(deletedLineDecoration, [options.range]); // Apply to the calculated range
        }
        // Store the newly created decorations for this editor
         if (currentDeletedDecorations.length > 0) {
            activeDeletedLineDecorations.set(editor, currentDeletedDecorations);
         }


    } catch (error) {
        console.error(`Error processing diff for ${filePath}:`, error);
        vscode.window.showErrorMessage(`Error applying inline diff: ${error instanceof Error ? error.message : String(error)}`);
        // Ensure all decorations are cleared on error
        clearDecorationsForEditor(editor);
    }
}


// This method is called when your extension is deactivated
export function deactivate() {
    // Disposal handled via context.subscriptions
    console.log('Enhanced Working Diffs extension deactivated.');
}