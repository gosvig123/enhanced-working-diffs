import * as Diff from 'diff'; // Import the diff library

/**
 * Parse git diff output to get structured information
 */
export function parseGitDiff(diffOutput: string) {
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

    if (!diffOutput) {
        return result;
    }

    // Split the diff output into lines
    const lines = diffOutput.split('\n');

    let currentHunk: typeof result.hunks[0] | null = null;

    // Process each line
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check if this is a hunk header
        const hunkHeaderMatch = line.match(/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
        if (hunkHeaderMatch) {
            // If we have a current hunk, add it to the result
            if (currentHunk) {
                result.hunks.push(currentHunk);
            }

            // Parse the hunk header
            const oldStart = parseInt(hunkHeaderMatch[1], 10);
            const oldCount = hunkHeaderMatch[2] ? parseInt(hunkHeaderMatch[2], 10) : 1;
            const newStart = parseInt(hunkHeaderMatch[3], 10);
            const newCount = hunkHeaderMatch[4] ? parseInt(hunkHeaderMatch[4], 10) : 1;

            // Create a new hunk
            currentHunk = {
                oldStart,
                oldCount,
                newStart,
                newCount,
                lines: []
            };
            continue;
        }

        // If we don't have a current hunk, skip this line
        if (!currentHunk) {
            continue;
        }

        // Process the line based on its prefix
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
        // Ignore other lines (like the diff header)
    }

    // Add the last hunk if we have one
    if (currentHunk) {
        result.hunks.push(currentHunk);
    }

    return result;
}

/**
 * Compare two strings and find character-level changes using the 'diff' library.
 * Returns an array of change objects compatible with the library's output.
 */
export function diffStrings(oldStr: string, newStr: string): Diff.Change[] {
    // Use diffChars for character-by-character comparison
    return Diff.diffChars(oldStr, newStr);
}
