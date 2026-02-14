#!/usr/bin/env node
/**
 * @codegraph
 * type: module
 * description: CLI entrypoint that registers all commands and parses arguments
 * owner: codegraph-cli
 * status: stable
 * tags: [cli, entrypoint, commander]
 * context:
 *   business_goal: Provide the main codegraph command-line interface
 *   domain: cli
 */
import { Command } from 'commander';
import {
  registerParseCommand,
  registerIndexCommand,
  registerQueryCommand,
  registerServeCommand,
  registerInitCommand,
} from './commands/index.js';

const program = new Command();

program
  .name('codegraph')
  .description('AI-navigable code documentation tool')
  .version('0.1.0');

registerParseCommand(program);
registerIndexCommand(program);
registerQueryCommand(program);
registerServeCommand(program);
registerInitCommand(program);

program.parse();
