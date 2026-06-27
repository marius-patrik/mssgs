import * as assert from 'node:assert';
import * as vscode from 'vscode';

suite('Extension integration', () => {
  test('extension is present and activates', async () => {
    const ext = vscode.extensions.getExtension('marius-patrik.mssgs');
    assert.ok(ext, 'mssgs extension is not installed');

    await ext.activate();
    assert.ok(ext.isActive, 'mssgs extension did not activate');
  });
});
