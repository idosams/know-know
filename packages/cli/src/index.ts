#!/usr/bin/env node
/**
 * @knowgraph
 * type: module
 * description: CLI entrypoint that registers all commands and parses arguments
 * owner: knowgraph-cli
 * status: stable
 * tags: [cli, entrypoint, commander]
 * context:
 *   business_goal: Provide the main knowgraph command-line interface
 *   domain: cli
 */
import { Command } from 'commander';
import {
  registerParseCommand,
  registerIndexCommand,
  registerQueryCommand,
  registerServeCommand,
  registerInitCommand,
  registerValidateCommand,
  registerCoverageCommand,
} from './commands/index.js';

const program = new Command();

program
  .name('knowgraph')
  .description('AI-navigable code documentation tool')
  .version('0.1.0');

registerParseCommand(program);
registerIndexCommand(program);
registerQueryCommand(program);
registerServeCommand(program);
registerInitCommand(program);
registerValidateCommand(program);
registerCoverageCommand(program);

program.parse();
