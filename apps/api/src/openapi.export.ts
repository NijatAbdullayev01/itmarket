import { NestFactory } from '@nestjs/core';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { format } from 'prettier';
import { AppModule } from './app.module';
import { configureApplication } from './app.setup';

async function exportOpenApi(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  const document = configureApplication(app);
  const target = resolve(__dirname, '../../../docs/api/openapi.json');
  const output = await format(JSON.stringify(document), { parser: 'json' });
  await writeFile(target, output, 'utf8');
  await app.close();
}

void exportOpenApi().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
