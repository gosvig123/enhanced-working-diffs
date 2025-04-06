import * as assert from 'assert';
import * as vscode from 'vscode';
import { GitService } from '../gitService';
import { parseGitDiff, diffStrings } from '../diffParser';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('GitService initialization', () => {
		const gitService = new GitService();
		assert.ok(gitService, 'GitService should be initialized');
	});

	test('parseGitDiff should handle empty input', () => {
		const result = parseGitDiff('');
		assert.strictEqual(result.hunks.length, 0, 'Should return empty hunks array for empty input');
	});

	test('parseGitDiff should parse a simple diff', () => {
		const diffOutput = `@@ -1,2 +1,3 @@
 unchanged line
-removed line
+added line
+another added line`;
		const result = parseGitDiff(diffOutput);
		assert.strictEqual(result.hunks.length, 1, 'Should have one hunk');
		assert.strictEqual(result.hunks[0].lines.length, 4, 'Hunk should have 4 lines');
		assert.strictEqual(result.hunks[0].lines[0].type, 'unchanged', 'First line should be unchanged');
		assert.strictEqual(result.hunks[0].lines[1].type, 'removed', 'Second line should be removed');
		assert.strictEqual(result.hunks[0].lines[2].type, 'added', 'Third line should be added');
		assert.strictEqual(result.hunks[0].lines[3].type, 'added', 'Fourth line should be added');
	});

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});
});
