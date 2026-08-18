import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../src/database/data-source';

const describeDatabase = process.env.RUN_DATABASE_INTEGRATION === 'true' ? describe : describe.skip;

describeDatabase('PostgreSQL migrations and constraints', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({ ...dataSourceOptions, entities: [] });
    await dataSource.initialize();
    await dataSource.runMigrations();
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('applies the operational schema and protects idempotency keys', async () => {
    const tables = await dataSource.query<{ table_name: string }[]>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('orders', 'payments', 'cash_sessions', 'inventory_movements')
    `);
    expect(tables.map((table) => table.table_name).sort()).toEqual([
      'cash_sessions',
      'inventory_movements',
      'orders',
      'payments',
    ]);

    const key = randomUUID();
    const values = ['integration-test', 'order-create', key, 'a'.repeat(64)];
    await dataSource.query(
      `INSERT INTO idempotency_records (subject_key, scope, idempotency_key, request_hash, expires_at)
       VALUES ($1, $2, $3, $4, now() + interval '1 day')`,
      values,
    );
    await expect(
      dataSource.query(
        `INSERT INTO idempotency_records (subject_key, scope, idempotency_key, request_hash, expires_at)
         VALUES ($1, $2, $3, $4, now() + interval '1 day')`,
        values,
      ),
    ).rejects.toMatchObject({ code: '23505' });
    await dataSource.query(
      'DELETE FROM idempotency_records WHERE subject_key = $1 AND scope = $2 AND idempotency_key = $3',
      values.slice(0, 3),
    );
  });
});
