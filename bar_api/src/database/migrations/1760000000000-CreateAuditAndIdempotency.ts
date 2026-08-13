import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditAndIdempotency1760000000000
  implements MigrationInterface
{
  name = 'CreateAuditAndIdempotency1760000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audit_events" (
        "id_audit_event" uuid NOT NULL DEFAULT gen_random_uuid(),
        "event_code" character varying(100) NOT NULL,
        "resource_type" character varying(80) NOT NULL,
        "resource_id" character varying(100),
        "actor_id" integer,
        "request_id" character varying(100),
        "metadata" jsonb,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_events" PRIMARY KEY ("id_audit_event"),
        CONSTRAINT "FK_audit_events_actor" FOREIGN KEY ("actor_id") REFERENCES "users"("id_user") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_audit_events_actor_created_at" ON "audit_events" ("actor_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_events_resource_created_at" ON "audit_events" ("resource_type", "resource_id", "created_at")`,
    );
    await queryRunner.query(`
      CREATE TABLE "idempotency_records" (
        "id_idempotency_record" uuid NOT NULL DEFAULT gen_random_uuid(),
        "subject_key" character varying(150) NOT NULL,
        "scope" character varying(100) NOT NULL,
        "idempotency_key" character varying(128) NOT NULL,
        "request_hash" character varying(64) NOT NULL,
        "response_status" integer,
        "response_body" jsonb,
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_idempotency_records" PRIMARY KEY ("id_idempotency_record")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_idempotency_subject_scope_key" ON "idempotency_records" ("subject_key", "scope", "idempotency_key")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_idempotency_expires_at" ON "idempotency_records" ("expires_at")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "idempotency_records"`);
    await queryRunner.query(`DROP TABLE "audit_events"`);
  }
}
