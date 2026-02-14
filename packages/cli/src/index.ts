#!/usr/bin/env node
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
