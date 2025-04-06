import * as assert from 'assert';
import * as vscode from 'vscode';
import { parseGitDiff } from '../diffParser';
import { describe, it } from 'mocha';

describe('Deleted Lines Test Suite', () => {
    it('parseGitDiff should correctly identify consecutive deleted lines', () => {
        // Test with multiple consecutive deleted lines
        const diffOutput = `@@ -1,5 +1,2 @@
 unchanged line
-deleted line 1
-deleted line 2
-deleted line 3
 unchanged line 2`;

        const result = parseGitDiff(diffOutput);

        // Verify we have one hunk
        assert.strictEqual(result.hunks.length, 1, 'Should have one hunk');

        // Count the number of deleted lines
        const deletedLines = result.hunks[0].lines.filter(line => line.type === 'removed');
        assert.strictEqual(deletedLines.length, 3, 'Should have 3 deleted lines');

        // Verify the content of each deleted line
        assert.strictEqual(deletedLines[0].content, 'deleted line 1', 'First deleted line content should match');
        assert.strictEqual(deletedLines[1].content, 'deleted line 2', 'Second deleted line content should match');
        assert.strictEqual(deletedLines[2].content, 'deleted line 3', 'Third deleted line content should match');
    });

    it('parseGitDiff should handle multiple groups of deleted lines', () => {
        // Test with multiple groups of deleted lines
        const diffOutput = `@@ -1,8 +1,4 @@
 unchanged line 1
-deleted line 1
-deleted line 2
 unchanged line 2
 unchanged line 3
-deleted line 3
-deleted line 4
-deleted line 5
 unchanged line 4`;

        const result = parseGitDiff(diffOutput);

        // Verify we have one hunk
        assert.strictEqual(result.hunks.length, 1, 'Should have one hunk');

        // Count the number of deleted lines
        const deletedLines = result.hunks[0].lines.filter(line => line.type === 'removed');
        assert.strictEqual(deletedLines.length, 5, 'Should have 5 deleted lines');

        // Verify the content of each deleted line
        assert.strictEqual(deletedLines[0].content, 'deleted line 1', 'First deleted line content should match');
        assert.strictEqual(deletedLines[1].content, 'deleted line 2', 'Second deleted line content should match');
        assert.strictEqual(deletedLines[2].content, 'deleted line 3', 'Third deleted line content should match');
        assert.strictEqual(deletedLines[3].content, 'deleted line 4', 'Fourth deleted line content should match');
        assert.strictEqual(deletedLines[4].content, 'deleted line 5', 'Fifth deleted line content should match');
    });

    it('parseGitDiff should handle deleted lines at the beginning of a file', () => {
        // Test with deleted lines at the beginning
        const diffOutput = `@@ -1,3 +1,1 @@
-deleted line 1
-deleted line 2
 unchanged line`;

        const result = parseGitDiff(diffOutput);

        // Verify we have one hunk
        assert.strictEqual(result.hunks.length, 1, 'Should have one hunk');

        // Count the number of deleted lines
        const deletedLines = result.hunks[0].lines.filter(line => line.type === 'removed');
        assert.strictEqual(deletedLines.length, 2, 'Should have 2 deleted lines');

        // Verify the content of each deleted line
        assert.strictEqual(deletedLines[0].content, 'deleted line 1', 'First deleted line content should match');
        assert.strictEqual(deletedLines[1].content, 'deleted line 2', 'Second deleted line content should match');
    });

    it('parseGitDiff should handle deleted lines at the end of a file', () => {
        // Test with deleted lines at the end
        const diffOutput = `@@ -1,3 +1,1 @@
 unchanged line
-deleted line 1
-deleted line 2`;

        const result = parseGitDiff(diffOutput);

        // Verify we have one hunk
        assert.strictEqual(result.hunks.length, 1, 'Should have one hunk');

        // Count the number of deleted lines
        const deletedLines = result.hunks[0].lines.filter(line => line.type === 'removed');
        assert.strictEqual(deletedLines.length, 2, 'Should have 2 deleted lines');

        // Verify the content of each deleted line
        assert.strictEqual(deletedLines[0].content, 'deleted line 1', 'First deleted line content should match');
        assert.strictEqual(deletedLines[1].content, 'deleted line 2', 'Second deleted line content should match');
    });
});
