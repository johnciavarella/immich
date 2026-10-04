import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`CREATE INDEX "asset_pixelCount_idx" ON "asset" (("width"::bigint * "height"));`.execute(db);
  await sql`INSERT INTO "migration_overrides" ("name", "value") VALUES ('index_asset_pixelCount_idx', '{"type":"index","name":"asset_pixelCount_idx","sql":"CREATE INDEX \\"asset_pixelCount_idx\\" ON \\"asset\\" ((\\"width\\"::bigint * \\"height\\"));"}'::jsonb);`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX "asset_pixelCount_idx";`.execute(db);
  await sql`DELETE FROM "migration_overrides" WHERE "name" = 'index_asset_pixelCount_idx';`.execute(db);
}
