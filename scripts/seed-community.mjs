import { parseArgs } from 'node:util';
import { writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { buildDataset, statistics, renderSql } from './seed/community.mjs';

const { values } = parseArgs({ options: {
  apply: { type: 'boolean', default: false },
  output: { type: 'string' },
  'as-of': { type: 'string' },
  'students-per-major': { type: 'string', default: '40' },
  container: { type: 'string', default: 'acasocial-postgres' },
  'db-user': { type: 'string', default: 'postgres' },
  'identity-db': { type: 'string', default: 'db' },
} });
const dataset = buildDataset({ asOf: values['as-of'] ?? new Date(), studentsPerMajor: Number(values['students-per-major']) });
const sql = renderSql(dataset, values['identity-db']);
console.log(JSON.stringify(statistics(dataset), null, 2));
if (values.output) {
  await writeFile(values.output, sql, 'utf8');
  console.log(`SQL written to ${values.output}`);
}
if (values.apply) {
  // Feed UTF-8 directly to psql; PowerShell's pipeline encoding varies by version.
  const child = spawn('docker', ['exec', '-i', values.container, 'psql', '-X', '-q', '-U', values['db-user'], '-d', values['identity-db'], '-v', 'ON_ERROR_STOP=1'], { stdio: ['pipe', 'pipe', 'inherit'], windowsHide: true });
  let tail = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', chunk => { tail = (tail + chunk).slice(-5000); });
  const result = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`psql exited ${code}; earlier database transactions may already be committed. Rerun after resolving the error.`)));
  });
  child.stdin.on('error', error => { if (error.code !== 'EPIPE') console.error(error.message); });
  child.stdin.end(sql, 'utf8');
  await result;
  console.log(tail);
} else if (!values.output) console.log('Validation only. Use --apply to add rows or --output <file.sql> to export SQL.');
