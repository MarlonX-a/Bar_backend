import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from 'src/users/users.module';
import { RolsModule } from '../rols/rols.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt/jwt.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthSession } from './entities/auth-session.entity';
import { AuthSessionService } from './session.service';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    RolsModule,
    TypeOrmModule.forFeature([AuthSession]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow<number>('ACCESS_TOKEN_TTL_SECONDS'),
          issuer: 'cholosbar-api',
          audience: 'cholosbar-client',
          algorithm: 'HS256',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthSessionService,
    JwtStrategy,
  ],
})
export class AuthModule {}
