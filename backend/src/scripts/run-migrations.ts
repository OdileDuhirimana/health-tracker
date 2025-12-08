import dataSource from '../config/database.config';

async function runMigrations(): Promise<void> {
  try {
    await dataSource.initialize();
    await dataSource.runMigrations();
    console.log('Database migrations completed successfully.');
  } catch (error) {
    console.error('Database migration failed.', error);
    process.exitCode = 1;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void runMigrations();
