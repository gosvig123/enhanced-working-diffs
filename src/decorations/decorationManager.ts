import * as vscode from 'vscode';

// Add deletedCharacterMarkers to the map
export type DecorationOptionsMap = {
    addedLines: vscode.DecorationOptions[];
    modifiedLines: vscode.DecorationOptions[]; // Hover message removed from here
    addedTexts: vscode.DecorationOptions[];
    deletedCharacterMarkers: vscode.DecorationOptions[]; // For hover at deletion point
};

/**
 * Manages decoration types for inline diffs.
 */
export class DecorationManager {
    private addedLineDecoration: vscode.TextEditorDecorationType;
    private modifiedLineDecoration: vscode.TextEditorDecorationType;
    private addedTextDecoration: vscode.TextEditorDecorationType;
    private deletedCharacterMarkerDecoration: vscode.TextEditorDecorationType; // New marker type

    // Store active decorations per editor
    private activeEditorDecorations: Map<vscode.TextEditor, vscode.TextEditorDecorationType[]> = new Map();

    constructor() {
        this.addedLineDecoration = vscode.window.createTextEditorDecorationType({
            border: '0 0 0 3px solid rgba(0, 255, 0, 0.4)',
            isWholeLine: true,
        });

        this.modifiedLineDecoration = vscode.window.createTextEditorDecorationType({
            border: '0 0 0 3px solid rgba(255, 170, 0, 0.5)',
            isWholeLine: true,
            // No hover message defined here anymore
        });

        this.addedTextDecoration = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(0, 255, 0, 0.15)',
            border: '1px solid rgba(0, 255, 0, 0.4)',
        });

        // New decoration for marking deletion points (NOT whole line)
        this.deletedCharacterMarkerDecoration = vscode.window.createTextEditorDecorationType({
            // Subtle visual marker, e.g., a small red underline or background color at the specific range
            // Using a border for visibility during debugging
            border: '1px dotted rgba(255, 0, 0, 0.7)',
            // Or try a background color:
            // backgroundColor: 'rgba(255, 0, 0, 0.2)',
            // The hover message will be attached via DecorationOptions
        });
    }

    /**
     * Applies the calculated decorations to the given editor.
     */
    public applyDecorations(editor: vscode.TextEditor, optionsMap: DecorationOptionsMap): void {
        this.clearDecorations(editor);
        const decorationsToApply: vscode.TextEditorDecorationType[] = [];

        const setAndTrack = (decorationType: vscode.TextEditorDecorationType, options: vscode.DecorationOptions[]) => {
            if (options.length > 0) {
                editor.setDecorations(decorationType, options);
                decorationsToApply.push(decorationType);
            } else {
                 editor.setDecorations(decorationType, []);
            }
        };

        setAndTrack(this.addedLineDecoration, optionsMap.addedLines);
        setAndTrack(this.modifiedLineDecoration, optionsMap.modifiedLines);
        setAndTrack(this.addedTextDecoration, optionsMap.addedTexts);
        setAndTrack(this.deletedCharacterMarkerDecoration, optionsMap.deletedCharacterMarkers); // Apply marker decorations

        this.activeEditorDecorations.set(editor, decorationsToApply);
    }

    /**
     * Clears all diff decorations managed by this instance from a specific editor.
     */
    public clearDecorations(editor: vscode.TextEditor): void {
        const activeTypes = this.activeEditorDecorations.get(editor);
        if (activeTypes) {
            activeTypes.forEach(decorationType => {
                editor.setDecorations(decorationType, []);
            });
            this.activeEditorDecorations.delete(editor);
        } else {
             // Fallback - clear all known types
             editor.setDecorations(this.addedLineDecoration, []);
             editor.setDecorations(this.modifiedLineDecoration, []);
             editor.setDecorations(this.addedTextDecoration, []);
             editor.setDecorations(this.deletedCharacterMarkerDecoration, []); // Clear markers
        }
    }

     /** Clears decorations from all editors. */
     public clearAllDecorations(): void {
         for (const editor of this.activeEditorDecorations.keys()) {
             this.clearDecorations(editor);
         }
         this.activeEditorDecorations.clear();
     }

    /** Disposes of all decoration types. */
    public dispose(): void {
        this.addedLineDecoration.dispose();
        this.modifiedLineDecoration.dispose();
        this.addedTextDecoration.dispose();
        this.deletedCharacterMarkerDecoration.dispose(); // Dispose marker type
        this.activeEditorDecorations.clear();
    }
}