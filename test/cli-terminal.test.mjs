import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const python = spawnSync('python3', ['--version'], { encoding: 'utf8' });
const supported = process.platform !== 'win32' && python.status === 0;

test('interactive CLI echoes typing and preserves multiline paste in a real terminal', {
  skip: supported ? false : 'The POSIX pseudo-terminal check requires Python 3', timeout: 90000
}, () => {
  for (const exit of ['quit', 'interrupt']) {
    const result = spawnSync('python3', ['test/fixtures/cli-terminal.py', process.execPath, exit], {
      encoding: 'utf8', timeout: 40000
    });
    assert.equal(result.status, 0, result.error?.message ?? result.stderr + result.stdout);
    assert.match(result.stdout, /PTY checks passed/);
  }
});
