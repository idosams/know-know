import { writeFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import type { Command } from 'commander';
import chalk from 'chalk';
import { stringify } from 'yaml';
import { detectLanguages, suggestFiles } from '../utils/detect.js';

interface InitOptions {
  readonly name?: string;
  readonly yes?: boolean;
}

function generateManifest(
  projectName: string,
  languages: readonly string[],
): object {
  return {
    version: '1.0',
    name: projectName,
    languages: [...languages],
    include: ['**/*'],
    exclude: ['node_modules', '.git', 'dist', 'build', '__pycache__'],
    index: {
      output_dir: '.codegraph',
      incremental: true,
    },
  };
}

async function runInit(options: InitOptions): Promise<void> {
  const dir = resolve('.');
  const configPath = resolve('.codegraph.yml');

  if (existsSync(configPath) && !options.yes) {
    console.log(chalk.yellow('.codegraph.yml already exists. Use -y to overwrite.'));
    return;
  }

  console.log(chalk.bold('Initializing CodeGraph...'));
  console.log('');

  // Step 1: Detect languages
  const languages = detectLanguages(dir);
  if (languages.length > 0) {
    console.log(`Detected languages: ${chalk.cyan(languages.join(', '))}`);
  } else {
    console.log(chalk.yellow('No supported languages detected.'));
  }

  // Step 2: Determine project name
  let projectName: string;
  if (options.name) {
    projectName = options.name;
  } else if (options.yes) {
    projectName = basename(dir);
  } else {
    // Use inquirer for interactive input
    try {
      const { default: inquirer } = await import('inquirer');
      const answer = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Project name:',
          default: basename(dir),
        },
      ]);
      projectName = answer.name;
    } catch {
      projectName = basename(dir);
    }
  }

  // Step 3: Generate .codegraph.yml
  const manifest = generateManifest(projectName, languages);
  const yamlContent = stringify(manifest);
  writeFileSync(configPath, yamlContent, 'utf-8');
  console.log(`\nCreated ${chalk.green('.codegraph.yml')}`);

  // Step 4: Suggest high-impact files
  const suggested = suggestFiles(dir);
  if (suggested.length > 0) {
    console.log('');
    console.log(chalk.bold('Suggested files to annotate first:'));
    for (const file of suggested.slice(0, 5)) {
      console.log(`  ${chalk.cyan(file)}`);
    }
  }

  // Step 5: Next steps
  console.log('');
  console.log(chalk.bold('Next steps:'));
  console.log(`  1. Add ${chalk.cyan('@codegraph')} annotations to your code`);
  console.log(`  2. Run ${chalk.cyan('codegraph index')} to build the graph`);
  console.log(`  3. Run ${chalk.cyan('codegraph serve')} to start the MCP server`);
  console.log(`  4. Run ${chalk.cyan('codegraph query <term>')} to search`);
}

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize CodeGraph in the current directory')
    .option('--name <name>', 'Project name')
    .option('-y, --yes', 'Non-interactive mode, use defaults')
    .action((options: InitOptions) => {
      runInit(options);
    });
}
