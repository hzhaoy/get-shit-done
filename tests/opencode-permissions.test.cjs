/**
 * Regression tests for OpenCode permission config handling.
 *
 * Ensures the installer does not crash when opencode.json uses the valid
 * top-level string form: "permission": "allow".
 */

const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.GSD_TEST_MODE = '1';
const { configureOpencodePermissions } = require('../bin/install.js');

const envKeys = ['OPENCODE_CONFIG_DIR', 'OPENCODE_CONFIG', 'XDG_CONFIG_HOME'];
const originalEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));

function restoreEnv(snapshot) {
  for (const key of envKeys) {
    if (snapshot[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = snapshot[key];
    }
  }
}

function createOpencodeConfigDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'gsd-opencode-'));
}

afterEach(() => {
  restoreEnv(originalEnv);
});

describe('configureOpencodePermissions', () => {
  test('does not crash or rewrite top-level string permissions', () => {
    const configDir = createOpencodeConfigDir();
    const configPath = path.join(configDir, 'opencode.json');
    const original = JSON.stringify({
      $schema: 'https://opencode.ai/config.json',
      permission: 'allow',
      skills: { paths: ['/tmp/skills'] },
    }, null, 2) + '\n';

    fs.writeFileSync(configPath, original);
    process.env.OPENCODE_CONFIG_DIR = configDir;

    assert.doesNotThrow(() => configureOpencodePermissions(true));
    assert.strictEqual(fs.readFileSync(configPath, 'utf8'), original);

    fs.rmSync(configDir, { recursive: true, force: true });
  });

  test('adds path-specific read and external_directory permissions for object configs', () => {
    const configDir = createOpencodeConfigDir();
    const configPath = path.join(configDir, 'opencode.json');
    fs.writeFileSync(configPath, JSON.stringify({ permission: {} }, null, 2) + '\n');
    process.env.OPENCODE_CONFIG_DIR = configDir;

    configureOpencodePermissions(true);

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const gsdPath = `${configDir.replace(/\\/g, '/')}/get-shit-done/*`;
    assert.strictEqual(config.permission.read[gsdPath], 'allow');
    assert.strictEqual(config.permission.external_directory[gsdPath], 'allow');

    fs.rmSync(configDir, { recursive: true, force: true });
  });
});
