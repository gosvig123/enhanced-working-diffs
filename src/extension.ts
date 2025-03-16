import * as vscode from 'vscode';
import * as path from 'path';
import { simpleGit } from 'simple-git';

// Track whether inline diff decorations are currently shown
let inlineDiffDecorationEnabled = false;
// Store the decorations so we can toggle them
let activeDecorations: vscode.TextEditorDecorationType[] = [];

export function activate(context: vscode.ExtensionContext) {
  // Register our command
  const disposable = vscode.commands.registerCommand('enhanced-working-diffs.toggleInlineDiff', async () => {
    // Get the active text editor
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor found');
      return;
    }

    // Toggle the decorations
    if (inlineDiffDecorationEnabled) {
      // If decorations are shown, clear them
      clearDecorations();
      inlineDiffDecorationEnabled = false;
      vscode.window.showInformationMessage('Inline diff decorations removed');
    } else {
      // Otherwise, show the diff
      await showGitDiff(editor);
      inlineDiffDecorationEnabled = true;
      vscode.window.showInformationMessage('Inline diff decorations applied');
    }
  });

  // Add a status bar item to make the command more accessible
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = "$(diff) Toggle Diff";
  statusBarItem.tooltip = "Toggle inline diff highlighting";
  statusBarItem.command = 'enhanced-working-diffs.toggleInlineDiff';
  statusBarItem.show();
  
  // Add event listener to update diffs when document changes
  vscode.workspace.onDidChangeTextDocument(async (event) => {
    if (inlineDiffDecorationEnabled) {
      // Get the active editor
      const editor = vscode.window.activeTextEditor;
      
      // Check if the changed document is the active one
      if (
        editor && event.document === editor.document) {
        // We need to clear existing decorations first to avoid stacking
        clearDecorations();
        
        // Small delay to let the edit complete and git picks up the changes
        setTimeout(async () => {
          try {
            await showGitDiff(editor);
          } catch (err) {
            console.error('Error updating diff:', err);
          }
        }, 300); // Slightly longer delay to ensure git has time to register the change
      }
    }
  }, null, context.subscriptions);

  context.subscriptions.push(disposable, statusBarItem);
}

/**
 * Clear all active decorations
 */
function clearDecorations() {
  for (const decoration of activeDecorations) {
    decoration.dispose();
  }
  activeDecorations = [];
}

/**
 * Show git diff for the given editor using simple-git
 */
async function showGitDiff(editor: vscode.TextEditor) {
  const document = editor.document;
  const filePath = document.uri.fsPath;
  
  try {
    // Get the workspace folder containing the file
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('File is not part of a workspace');
      return;
    }
    
    const git = simpleGit(workspaceFolder.uri.fsPath);
    
    // Check if file is tracked by git
    const status = await git.status();
    const relativePath = path.relative(workspaceFolder.uri.fsPath, filePath).replace(/\\/g, '/');
    
    // Check if the file has changes
    const isModified = status.modified.includes(relativePath) || 
                        status.not_added.includes(relativePath) ||
                        status.created.includes(relativePath);
                        
    if (!isModified) {
      vscode.window.showInformationMessage('No git changes detected in this file');
      return;
    }
    
    // Get the diff
    const diff = await git.diff([relativePath]);
    
    // If there's a diff, parse and highlight it
    if (diff) {
      applyGitDiffHighlighting(editor, diff);
    } else {
      vscode.window.showInformationMessage('No changes detected');
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Error getting git diff: ${error}`);
  }
}

/**
 * Parse git diff output and apply highlighting
 */
function applyGitDiffHighlighting(editor: vscode.TextEditor, diffOutput: string) {
  // Clear any existing decorations
  clearDecorations();
  
  // Create decoration types - using subtle borders instead of background colors for less intrusion
  const addedLineDecoration = vscode.window.createTextEditorDecorationType({
    border: '0 0 0 3px solid rgba(0, 255, 0, 0.4)',
    isWholeLine: true,
  });
  
  const modifiedLineDecoration = vscode.window.createTextEditorDecorationType({
    border: '0 0 0 3px solid rgba(255, 170, 0, 0.5)',
    isWholeLine: true,
  });
  
  const deletedLineHintDecoration = vscode.window.createTextEditorDecorationType({
    border: '0 0 0 2px dashed rgba(255, 70, 70, 0.3)',
    isWholeLine: true,
  });
  
  const addedTextDecoration = vscode.window.createTextEditorDecorationType({
    border: '0 0 1px 0 solid rgba(0, 255, 0, 0.5)',
    backgroundColor: 'rgba(0, 255, 0, 0.15)',
  });
  
  const deletedTextDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(255, 50, 50, 0.15)',
  });
  
  const hoverInfoDecoration = vscode.window.createTextEditorDecorationType({
    // No visible decoration, just for hover info
  });
  
  // Store decorations to dispose them later
  activeDecorations.push(
    addedLineDecoration, 
    modifiedLineDecoration, 
    deletedLineHintDecoration,
    addedTextDecoration,
    deletedTextDecoration,
    hoverInfoDecoration
  );
  
  // Parse diff output
  const addedLines: vscode.Range[] = [];
  const modifiedLines: vscode.Range[] = [];
  const deletedLineHints: vscode.Range[] = [];
  const addedTexts: vscode.Range[] = [];
  const deletedTexts: vscode.Range[] = [];
  const hoverDecorations: vscode.DecorationOptions[] = [];
  
  // Parse the diff to build a mapping of actual changes
  const parsedDiff = parseGitDiff(diffOutput);
  
  // Now apply the decorations based on the parsed diff
  for (const hunk of parsedDiff.hunks) {
    // Track current line in the editor
    let editorLine = hunk.newStart - 1; // 0-based indexing
    
    // Process pairs of old/new lines
    for (let i = 0; i < hunk.lines.length; i++) {
      const line = hunk.lines[i];
      
      if (line.type === 'added') {
        // Completely new line
        if (editorLine < editor.document.lineCount) {
          // Mark the line with a green border
          addedLines.push(new vscode.Range(editorLine, 0, editorLine, 0));
          
          // Check if this is part of a modified line rather than a pure addition
          if (i > 0 && hunk.lines[i-1].type === 'removed') {
            // This looks like a modified line, not just an addition
            const oldLine = hunk.lines[i-1].content;
            const newLine = line.content;
            
            // Find character-level changes
            const changes = diffStrings(oldLine, newLine);
            
            // Add decorations for changed text portions
            for (const change of changes) {
              if (change.type === 'added' && change.end > change.start) {
                const startPos = new vscode.Position(editorLine, change.start);
                const endPos = new vscode.Position(editorLine, change.end);
                addedTexts.push(new vscode.Range(startPos, endPos));
              }
              else if (change.type === 'removed') {
                // For deleted text, we need to find where it would have been in the new line
                const lineNumber = editor.document.lineAt(editorLine).lineNumber
                for (let i = 0; i < lineNumber; i++) {
                  const line = editor.document.lineAt(i);
                  const lineText = line.text;
                  if (lineText.length > 0) {
                    const startPos = new vscode.Position(i, 0);
                    const endPos = new vscode.Position(i, lineText.length);
                    deletedTexts.push(new vscode.Range(startPos, endPos));
                  }
                }

                

              }
            }
            
            // Remove from added lines as we're handling it differently
            addedLines.pop();
            
            // Mark as modified instead
            modifiedLines.push(new vscode.Range(editorLine, 0, editorLine, 0));
          } else {
            // This is a completely new line - highlight the entire content
            const lineText = editor.document.lineAt(editorLine).text;
            if (lineText.length > 0) {
              const startPos = new vscode.Position(editorLine, 0);
              const endPos = new vscode.Position(editorLine, lineText.length);
              addedTexts.push(new vscode.Range(startPos, endPos));
            }
          }
        }
        editorLine++;
      } 
      else if (line.type === 'removed') {
        // Line was removed - mark the next line after (if any)
        const nextLine = i < hunk.lines.length - 1 ? hunk.lines[i+1] : null;
        
        // If the next line isn't an addition (replacement), show as deleted
        if (!nextLine || nextLine.type !== 'added') {
            if (editorLine < editor.document.lineCount) {
                deletedLineHints.push(new vscode.Range(editorLine, 0, editorLine, 0));
                
                // Track all consecutive deleted lines
                const deletedLines = [line.content];
                let deleteCount = 1;
                
                // Look ahead for consecutive deletions
                while (i + deleteCount < hunk.lines.length && 
                       hunk.lines[i + deleteCount].type === 'removed') {
                    deletedLines.push(hunk.lines[i + deleteCount].content);
                    deleteCount++;
                }
                
                // Create multi-line decoration with proper line spacing
                hoverDecorations.push({
                    range: new vscode.Range(editorLine, 0, editorLine, 0),
                    renderOptions: {
                        after: {
                            contentText: deletedLines.join('\n'),
                            backgroundColor: 'rgba(255, 100, 100, 0.15)',
                            color: 'rgba(150, 30, 30, 0.8)',
                            fontStyle: 'italic',
                            margin: '0 0 0 12px',
                            border: '1px solid rgba(255, 70, 70, 0.4)'
                        }
                    }
                });
                
                // Skip processed lines in outer loop
                i += deleteCount - 1;
            }
        }
        // Don't increment editorLine for removed lines
      }
      else if (line.type === 'unchanged') {
        editorLine++;
      }
    }
  }
  
  // Apply decorations
  editor.setDecorations(addedLineDecoration, addedLines);
  editor.setDecorations(modifiedLineDecoration, modifiedLines);
  editor.setDecorations(deletedLineHintDecoration, deletedLineHints);
  editor.setDecorations(addedTextDecoration, addedTexts);
  editor.setDecorations(deletedTextDecoration, deletedTexts);
  editor.setDecorations(hoverInfoDecoration, hoverDecorations);
}

/**
 * Parse git diff output to get structured information
 */
function parseGitDiff(diffOutput: string) {
  const result = {
    hunks: [] as Array<{
      oldStart: number;
      oldCount: number;
      newStart: number;
      newCount: number;
      lines: Array<{
        type: 'added' | 'removed' | 'unchanged';
        content: string;
      }>;
    }>
  };
  
  const lines = diffOutput.split('\n');
  let currentHunk: typeof result.hunks[0] | null = null;
  
  for (const line of lines) {
    // Hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+),(\d+) \+(\d+),(\d+) @@/);
      if (match) {
        if (currentHunk) {
          result.hunks.push(currentHunk);
        }
        
        currentHunk = {
          oldStart: parseInt(match[1]),
          oldCount: parseInt(match[2]),
          newStart: parseInt(match[3]),
          newCount: parseInt(match[4]),
          lines: []
        };
      }
      continue;
    }
    
    if (!currentHunk) {
      continue; // Skip lines before first hunk
    }
    
    // Process lines in the hunk
    if (line.startsWith('+')) {
      currentHunk.lines.push({
        type: 'added',
        content: line.substring(1)
      });
    } else if (line.startsWith('-')) {
      currentHunk.lines.push({
        type: 'removed',
        content: line.substring(1)
      });
    } else if (line.startsWith(' ')) {
      currentHunk.lines.push({
        type: 'unchanged',
        content: line.substring(1)
      });
    }
  }
  
  if (currentHunk) {
    result.hunks.push(currentHunk);
  }
  
  return result;
}

/**
 * Compare two strings and find character-level changes
 */
function diffStrings(oldStr: string, newStr: string) {
  const changes: Array<{ type: 'added' | 'removed' | 'unchanged', start: number, end: number }> = [];
  
  // Find common prefix length
  let prefixLength = 0;
  const minLength = Math.min(oldStr.length, newStr.length);
  
  while (prefixLength < minLength && oldStr[prefixLength] === newStr[prefixLength]) {
    prefixLength++;
  }
  
  // Find common suffix length, excluding the common prefix
  let oldSuffixLength = oldStr.length - prefixLength;
  let newSuffixLength = newStr.length - prefixLength;
  let suffixLength = 0;
  
  while (suffixLength < oldSuffixLength && suffixLength < newSuffixLength &&
         oldStr[oldStr.length - suffixLength - 1] === newStr[newStr.length - suffixLength - 1]) {
    suffixLength++;
  }
  
  // Adjust the suffix values
  oldSuffixLength -= suffixLength;
  newSuffixLength -= suffixLength;
  
  // Mark unchanged prefix
  if (prefixLength > 0) {
    changes.push({
      type: 'unchanged',
      start: 0,
      end: prefixLength
    });
  }
  
  // Mark changed middle parts
  if (oldSuffixLength > 0) {
    changes.push({
      type: 'removed',
      start: prefixLength,
      end: prefixLength + oldSuffixLength
    });
  }
  
  if (newSuffixLength > 0) {
    changes.push({
      type: 'added',
      start: prefixLength,
      end: prefixLength + newSuffixLength
    });
  }
  
  // Mark unchanged suffix
  if (suffixLength > 0) {
    changes.push({
      type: 'unchanged',
      start: oldStr.length - suffixLength,
      end: oldStr.length
    });
  }
  
  return changes;
}

// This method is called when your extension is deactivated
export function deactivate() {
  // Clean up any decorations when the extension is deactivated
  clearDecorations();
}