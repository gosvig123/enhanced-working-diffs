import * as vscode from 'vscode';
import * as Diff from 'diff'; // Import the diff library types
import { parseGitDiff, diffStrings } from '../diffParser'; // diffStrings now uses the 'diff' library
import { DecorationOptionsMap } from './decorationManager'; // Map now includes deletedCharacterMarkers

// Use ReturnType to correctly infer the type from the parser function
type ParsedDiff = ReturnType<typeof parseGitDiff>;

// Define the structure for the return value
export interface DiffCalculationResult {
    decorationOptions: DecorationOptionsMap; // Includes added/modified lines, added text, marker
    inlineDeletedLineOptions: vscode.DecorationOptions[]; // Options for rendering deleted lines inline
}

export class DiffDecorationProvider {

    /**
     * Analyzes the parsed diff and generates DecorationOptions for standard highlights
     * and for rendering deleted lines inline.
     * @param parsedDiff The structured diff data from parseGitDiff.
     * @param editor The TextEditor where the diff is being displayed.
     * @returns An object containing standard decoration options and options for inline deleted lines.
     */
    public calculateDecorations(parsedDiff: ParsedDiff, editor: vscode.TextEditor): DiffCalculationResult {
        // Initialize map including deletedCharacterMarkers
        const decorationOptions: DecorationOptionsMap = {
            addedLines: [],
            modifiedLines: [],
            addedTexts: [],
            deletedCharacterMarkers: [], // Initialize marker array
        };
        const inlineDeletedLineOptions: vscode.DecorationOptions[] = [];
        const document = editor.document;

        for (const hunk of parsedDiff.hunks) {
            let editorLineIndex = hunk.newStart - 1;
            let oldLineIndexInHunk = 0;

            for (let i = 0; i < hunk.lines.length; i++) {
                const lineInfo = hunk.lines[i];

                if (lineInfo.type === 'added') {
                    if (editorLineIndex < document.lineCount) {
                        const currentEditorLine = document.lineAt(editorLineIndex);
                        const lineRange = new vscode.Range(editorLineIndex, 0, editorLineIndex, 0);

                        if (i > 0 && hunk.lines[i - 1].type === 'removed') {
                            // --- Modification ---
                            const oldLineContent = hunk.lines[i - 1].content;
                            const newLineContent = lineInfo.content;
                            const charChanges: Diff.Change[] = diffStrings(oldLineContent, newLineContent);

                            let currentCharacterIndex = 0;
                            // Removed collection of removedSegments for line hover

                            for (const change of charChanges) {
                                const changeLength = change.value.length;
                                if (change.added) {
                                    const startPos = new vscode.Position(editorLineIndex, currentCharacterIndex);
                                    const endPos = new vscode.Position(editorLineIndex, currentCharacterIndex + changeLength);
                                    decorationOptions.addedTexts.push({ range: new vscode.Range(startPos, endPos) });
                                    currentCharacterIndex += changeLength;
                                } else if (change.removed) {
                                    // Create a marker at the deletion point and show deleted text using 'after'
                                    const startPos = new vscode.Position(editorLineIndex, currentCharacterIndex);
                                    const markerRange = new vscode.Range(startPos, startPos); // Zero-width range

                                    // Add decoration options with renderOptions.after
                                    decorationOptions.deletedCharacterMarkers.push({
                                        range: markerRange,
                                        // Remove hoverMessage
                                        renderOptions: {
                                            after: {
                                                contentText: change.value, // Show the actual deleted text
                                                color: 'rgba(255, 80, 80, 0.8)', // Reddish color
                                                backgroundColor: 'rgba(255, 0, 0, 0.1)', // Faint red background
                                                // fontStyle: 'italic', // Optional styling
                                                // textDecoration: 'line-through', // Could add strike-through here too
                                                margin: '0 0 0 -0.5ch', // Try negative margin to pull it left slightly
                                                border: '1px dotted rgba(255, 0, 0, 0.5)', // Keep a subtle border maybe?
                                            }
                                        }
                                    });
                                    console.log(`[DiffDecorationProvider] Adding deletedCharacterMarker at (${startPos.line + 1}, ${startPos.character}) with content: ${change.value}`);

                                    // DO NOT advance currentCharacterIndex for removed segments
                                } else { // Common segment
                                    currentCharacterIndex += changeLength;
                                }
                            }

                            // Add modified line decoration (without hover message)
                            decorationOptions.modifiedLines.push({ range: lineRange });

                        } else {
                            // --- Pure addition ---
                            decorationOptions.addedLines.push({ range: lineRange });
                            if (currentEditorLine.text.length > 0) {
                                const startPos = new vscode.Position(editorLineIndex, 0);
                                const endPos = new vscode.Position(editorLineIndex, currentEditorLine.text.length);
                                decorationOptions.addedTexts.push({ range: new vscode.Range(startPos, endPos) });
                            }
                        }
                    }
                    editorLineIndex++;
                } else if (lineInfo.type === 'removed') {
                    const isModification = (i + 1 < hunk.lines.length && hunk.lines[i + 1].type === 'added');

                    if (!isModification) {
                        // --- Pure deletion ---
                        const precedingEditorLineIndex = editorLineIndex - 1;
                        const firstDeletedLineNumber = hunk.oldStart + oldLineIndexInHunk;

                        if (precedingEditorLineIndex >= 0) {
                             if (precedingEditorLineIndex < document.lineCount) {
                                const precedingLineRange = document.lineAt(precedingEditorLineIndex).range;
                                const formattedLine = `- ${firstDeletedLineNumber}: ${lineInfo.content}`;
                                inlineDeletedLineOptions.push({
                                    range: precedingLineRange,
                                    renderOptions: { after: { contentText: formattedLine, color: 'rgba(200, 50, 50, 0.7)', backgroundColor: 'rgba(255, 100, 100, 0.1)', margin: '0 0 0 3ch' } }
                                });
                             } else { console.warn(`Preceding line index ${precedingEditorLineIndex} out of bounds`); }
                        } else {
                             if (document.lineCount > 0) {
                                const lineZeroRange = document.lineAt(0).range;
                                const formattedLine = `- ${firstDeletedLineNumber}: ${lineInfo.content}`;
                                inlineDeletedLineOptions.push({
                                    range: lineZeroRange,
                                    renderOptions: { after: { contentText: formattedLine, color: 'rgba(200, 50, 50, 0.7)', backgroundColor: 'rgba(255, 100, 100, 0.1)', margin: '0 0 0 3ch' } }
                                });
                                console.warn("Deletion at start of file - attaching inline display to line 0.");
                             } else { console.warn("Cannot attach deletion decoration at start of empty file."); }
                        }
                    }
                    oldLineIndexInHunk++;
                } else if (lineInfo.type === 'unchanged') {
                    editorLineIndex++;
                    oldLineIndexInHunk++;
                }
            }
        }

        return { decorationOptions, inlineDeletedLineOptions };
    }
}