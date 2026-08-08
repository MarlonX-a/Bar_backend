import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthSessions1730000000000 implements MigrationInterface {
  name = 'CreateAuthSessions1730000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "auth_sessions" (
        "id_session" uuid NOT NULL,
        "user_id" integer NOT NULL,
        "family_id" uuid NOT NULL,
        "refresh_token_hash" character varying(64) NOT NULL,
        "refresh_token_expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "family_expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "last_used_at" TIMESTAMP WITH TIME ZONE,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "replaced_by_session_id" uuid,
        "revocation_reason" character varying(64),
        "user_agent" character varying(512),
        "ip_address" inet,
        CONSTRAINT "PK_auth_sessions" PRIMARY KEY ("id_session"),
        CONSTRAINT "UQ_auth_sessions_refresh_token_hash" UNIQUE ("refresh_token_hash"),
        CONSTRAINT "FK_auth_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id_user") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_auth_sessions_user_id" ON "auth_sessions" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_auth_sessions_family_id" ON "auth_sessions" ("family_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_auth_sessions_active_expiry" ON "auth_sessions" ("refresh_token_expires_at") WHERE "revoked_at" IS NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "auth_sessions"`);
  }
}
