// #!/usr/bin/env node
/**
 * CLI entry point for gsd-sdk.
 *
 * Usage: gsd-sdk run "<prompt>" [--project-dir <dir>] [--ws-port <port>]
 *                                [--model <model>] [--max-budget <n>]
 */

import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { GSD } from './index.js';
import { CLITransport } from './cli-transport.js';
import { WSTransport } from './ws-transport.js';

// ─── Parsed CLI args ─────────────────────────────────────────────────────────

export interface ParsedCliArgs {
  command: string | undefined;
  prompt: string | undefined;
  projectDir: string;
  wsPort: number | undefined;
  model: string | undefined;
  maxBudget: number | undefined;
  help: boolean;
  version: boolean;
}

/**
 * Parse CLI arguments into a structured object.
 * Exported for testing — the main() function uses this internally.
 */
export function parseCliArgs(argv: string[]): ParsedCliArgs {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      'project-dir': { type: 'string', default: process.cwd() },
      'ws-port': { type: 'string' },
      model: { type: 'string' },
      'max-budget': { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'v', default: false },
    },
    allowPositionals: true,
    strict: true,
  });

  const command = positionals[0] as string | undefined;
  const prompt = positionals.slice(1).join(' ') || undefined;

  return {
    command,
    prompt,
    projectDir: values['project-dir'] as string,
    wsPort: values['ws-port'] ? Number(values['ws-port']) : undefined,
    model: values.model as string | undefined,
    maxBudget: values['max-budget'] ? Number(values['max-budget']) : undefined,
    help: values.help as boolean,
    version: values.version as boolean,
  };
}

// ─── Usage ───────────────────────────────────────────────────────────────────

const USAGE = `
Usage: gsd-sdk run "<prompt>" [options]

Commands:
  run <prompt>    Run a full milestone from a text prompt

Options:
  --project-dir <dir>   Project directory (default: cwd)
  --ws-port <port>      Enable WebSocket transport on <port>
  --model <model>       Override LLM model
  --max-budget <n>      Max budget per step in USD
  -h, --help            Show this help
  -v, --version         Show version
`.trim();

/**
 * Read the package version from package.json.
 */
async function getVersion(): Promise<string> {
  try {
    const pkgPath = resolve(fileURLToPath(import.meta.url), '..', '..', 'package.json');
    const raw = await readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  let args: ParsedCliArgs;

  try {
    args = parseCliArgs(argv);
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }

  if (args.help) {
    console.log(USAGE);
    return;
  }

  if (args.version) {
    const ver = await getVersion();
    console.log(`gsd-sdk v${ver}`);
    return;
  }

  if (args.command !== 'run' || !args.prompt) {
    console.error('Error: Expected "gsd-sdk run <prompt>"');
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }

  // Build GSD instance
  const gsd = new GSD({
    projectDir: args.projectDir,
    model: args.model,
    maxBudgetUsd: args.maxBudget,
  });

  // Wire CLI transport (always active)
  const cliTransport = new CLITransport();
  gsd.addTransport(cliTransport);

  // Optional WebSocket transport
  let wsTransport: WSTransport | undefined;
  if (args.wsPort !== undefined) {
    wsTransport = new WSTransport({ port: args.wsPort });
    await wsTransport.start();
    gsd.addTransport(wsTransport);
    console.log(`WebSocket transport listening on port ${args.wsPort}`);
  }

  try {
    const result = await gsd.run(args.prompt);

    // Final summary
    const status = result.success ? 'SUCCESS' : 'FAILED';
    const phases = result.phases.length;
    const cost = result.totalCostUsd.toFixed(2);
    const duration = (result.totalDurationMs / 1000).toFixed(1);
    console.log(`\n[${status}] ${phases} phase(s), $${cost}, ${duration}s`);

    if (!result.success) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error(`Fatal error: ${(err as Error).message}`);
    process.exitCode = 1;
  } finally {
    // Clean up transports
    cliTransport.close();
    if (wsTransport) {
      wsTransport.close();
    }
  }
}

// ─── Auto-run when invoked directly ──────────────────────────────────────────

main();
