import { spawn } from 'node:child_process';
import { Client } from 'pg';
import { configureTestEnvironment } from './test-env';

async function main(): Promise<void> {
  const testEnvironment = configureTestEnvironment();

  await recreateTestDatabase(
    testEnvironment.adminDatabaseUrl,
    testEnvironment.databaseName,
  );
  await runProcess('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    DATABASE_URL: testEnvironment.databaseUrl,
  });
  await runProcess('pnpm', ['exec', 'jest', ...process.argv.slice(2)], {
    DATABASE_URL: testEnvironment.databaseUrl,
    NODE_ENV: 'test',
    NODE_OPTIONS: '--experimental-vm-modules',
    REDIS_URL: testEnvironment.redisUrl,
  });
}

async function recreateTestDatabase(
  adminDatabaseUrl: string,
  databaseName: string,
): Promise<void> {
  if (!/(?:_ci|_test)$/.test(databaseName)) {
    throw new Error(
      `Refusing to recreate non-test database "${databaseName}".`,
    );
  }

  const client = new Client({ connectionString: adminDatabaseUrl });
  await client.connect();

  try {
    await client.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
      [databaseName],
    );
    await client.query(
      `DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)}`,
    );
    await client.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
  } finally {
    await client.end();
  }
}

async function runProcess(
  command: string,
  args: string[],
  extraEnvironment: NodeJS.ProcessEnv,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...extraEnvironment,
      },
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal !== null) {
        reject(new Error(`${command} exited with signal ${signal}`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`${command} exited with code ${code ?? 'unknown'}`));
        return;
      }

      resolve();
    });
  });
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : error;
  console.error(message);
  process.exit(1);
});
