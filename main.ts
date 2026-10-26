import * as dotenv from 'dotenv';
import { mkdir, writeFile } from 'node:fs/promises';
import { CodeReviewOrchestrator } from './orchestrator.js';
import { ReportGenerator } from './utils/report-generator.js';

dotenv.config();

async function main(): Promise<void> {
  const [owner, repo, prStr] = process.argv.slice(2);

  // Validate command-line arguments.
  if (!owner || !repo || !prStr || !/^\d+$/.test(prStr)) {
    console.error(
      'Usage: npm run dev -- <owner> <repo> <pr-number>'
    );
    process.exitCode = 1;
    return;
  }

  const prNumber = Number(prStr);

  if (!Number.isSafeInteger(prNumber) || prNumber <= 0) {
    console.error('Error: PR number must be a positive integer.');
    process.exitCode = 1;
    return;
  }

  // Validate authentication without printing credentials.
  const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasAwsAccessKey = Boolean(process.env.AWS_ACCESS_KEY_ID);
  const hasAwsSecretKey = Boolean(process.env.AWS_SECRET_ACCESS_KEY);
  const hasBedrockCredentials = hasAwsAccessKey && hasAwsSecretKey;

  if (!hasAnthropicKey && !hasBedrockCredentials) {
    console.error(
      'Authentication is not configured. Set ANTHROPIC_API_KEY, ' +
      'or configure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY for Bedrock.'
    );
    process.exitCode = 1;
    return;
  }

  if (hasBedrockCredentials && !process.env.AWS_REGION) {
    console.error('AWS_REGION is required when using AWS Bedrock.');
    process.exitCode = 1;
    return;
  }

  if (!process.env.ANTHROPIC_MODEL) {
    console.error(
      'ANTHROPIC_MODEL is required. Set it in your environment or .env file.'
    );
    process.exitCode = 1;
    return;
  }

  if (!process.env.GITHUB_TOKEN) {
    console.error('GITHUB_TOKEN is required to access GitHub pull requests.');
    process.exitCode = 1;
    return;
  }

  if (hasAnthropicKey) {
    console.log('🔐 Using Anthropic API authentication');
  } else {
    console.log('🔐 Using AWS Bedrock authentication');
  }

  console.log(`Reviewing ${owner}/${repo}#${prNumber}...`);

  try {
    const orchestrator = new CodeReviewOrchestrator({
      model: process.env.ANTHROPIC_MODEL,
    });

    const report = await orchestrator.reviewPullRequest(
      owner,
      repo,
      prNumber
    );

    const generator = new ReportGenerator();
    const reportsDir = 'reports';

    await mkdir(reportsDir, { recursive: true });

    const baseName = `${owner}-${repo}-pr-${prNumber}`;

    const markdown = generator.generateMarkdownReport(report);
    const html = generator.generateHTMLReport(report);
    const json = generator.generateJSONReport(report);

    await Promise.all([
      writeFile(`${reportsDir}/${baseName}.md`, markdown, 'utf8'),
      writeFile(`${reportsDir}/${baseName}.html`, html, 'utf8'),
      writeFile(`${reportsDir}/${baseName}.json`, json, 'utf8'),
    ]);

    console.log('Review completed. Reports saved:');
    console.log(`  ${reportsDir}/${baseName}.md`);
    console.log(`  ${reportsDir}/${baseName}.html`);
    console.log(`  ${reportsDir}/${baseName}.json`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred';

    console.error('Review failed:', message);
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(
    'Application failed:',
    error instanceof Error ? error.message : 'Unexpected error'
  );
  process.exitCode = 1;
});
