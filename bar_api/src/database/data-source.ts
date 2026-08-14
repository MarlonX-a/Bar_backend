import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { validateEnv } from '../config/env.validation';
import { Perfil } from '../perfil/entities/perfil.entity';
import { Rol } from '../rols/entities/rol.entity';
import { User } from '../users/entities/user.entity';
import { AuthSession } from '../auth/entities/auth-session.entity';
import { Permission } from '../rols/entities/permission.entity';
import { AuditEvent } from '../audit/entities/audit-event.entity';
import { IdempotencyRecord } from '../common/idempotency/entities/idempotency-record.entity';
import { Category } from '../catalog/entities/category.entity';
import { Product } from '../catalog/entities/product.entity';
import { RestaurantTable } from '../tables/entities/restaurant-table.entity';
import { TableSession } from '../tables/entities/table-session.entity';

const nodeEnv = process.env.NODE_ENV ?? 'development';
loadEnv({ path: `.env.${nodeEnv}`, quiet: true });
loadEnv({ path: '.env', quiet: true });

const env = validateEnv(process.env);

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: env.DB_HOST as string,
  port: env.DB_PORT as number,
  username: env.DB_USERNAME as string,
  password: env.DB_PASSWORD as string,
  database: env.DB_NAME as string,
  entities: [
    User,
    Rol,
    Perfil,
    AuthSession,
    Permission,
    AuditEvent,
    IdempotencyRecord,
    Category,
    Product,
    RestaurantTable,
    TableSession,
  ],
  migrations: [join(__dirname, 'migrations/*{.js,.ts}')],
  synchronize: false,
  migrationsRun: false,
};

export default new DataSource(dataSourceOptions);
