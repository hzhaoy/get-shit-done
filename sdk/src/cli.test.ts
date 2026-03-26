import { describe, it, expect } from 'vitest';
import { parseCliArgs } from './cli.js';

describe('parseCliArgs', () => {
  it('parses run <prompt> with defaults', () => {
    const result = parseCliArgs(['run', 'build auth']);

    expect(result.command).toBe('run');
    expect(result.prompt).toBe('build auth');
    expect(result.help).toBe(false);
    expect(result.version).toBe(false);
    expect(result.wsPort).toBeUndefined();
    expect(result.model).toBeUndefined();
    expect(result.maxBudget).toBeUndefined();
  });

  it('parses --help flag', () => {
    const result = parseCliArgs(['--help']);

    expect(result.help).toBe(true);
    expect(result.command).toBeUndefined();
  });

  it('parses -h short flag', () => {
    const result = parseCliArgs(['-h']);

    expect(result.help).toBe(true);
  });

  it('parses --version flag', () => {
    const result = parseCliArgs(['--version']);

    expect(result.version).toBe(true);
  });

  it('parses -v short flag', () => {
    const result = parseCliArgs(['-v']);

    expect(result.version).toBe(true);
  });

  it('parses --ws-port as number', () => {
    const result = parseCliArgs(['run', 'build X', '--ws-port', '8080']);

    expect(result.command).toBe('run');
    expect(result.prompt).toBe('build X');
    expect(result.wsPort).toBe(8080);
  });

  it('parses --model option', () => {
    const result = parseCliArgs(['run', 'build X', '--model', 'claude-sonnet-4-6']);

    expect(result.model).toBe('claude-sonnet-4-6');
  });

  it('parses --max-budget option', () => {
    const result = parseCliArgs(['run', 'build X', '--max-budget', '10']);

    expect(result.maxBudget).toBe(10);
  });

  it('parses --project-dir option', () => {
    const result = parseCliArgs(['run', 'build X', '--project-dir', '/tmp/my-project']);

    expect(result.projectDir).toBe('/tmp/my-project');
  });

  it('returns undefined command and prompt for empty args', () => {
    const result = parseCliArgs([]);

    expect(result.command).toBeUndefined();
    expect(result.prompt).toBeUndefined();
    expect(result.help).toBe(false);
    expect(result.version).toBe(false);
  });

  it('parses multi-word prompts from positionals', () => {
    const result = parseCliArgs(['run', 'build', 'the', 'entire', 'app']);

    expect(result.prompt).toBe('build the entire app');
  });

  it('handles all options combined', () => {
    const result = parseCliArgs([
      'run', 'build auth',
      '--project-dir', '/tmp/proj',
      '--ws-port', '9090',
      '--model', 'claude-sonnet-4-6',
      '--max-budget', '15',
    ]);

    expect(result.command).toBe('run');
    expect(result.prompt).toBe('build auth');
    expect(result.projectDir).toBe('/tmp/proj');
    expect(result.wsPort).toBe(9090);
    expect(result.model).toBe('claude-sonnet-4-6');
    expect(result.maxBudget).toBe(15);
  });

  it('throws on unknown options (strict mode)', () => {
    expect(() => parseCliArgs(['--unknown-flag'])).toThrow();
  });
});
