import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const ssl = configService.get<boolean>('database.ssl');

        return {
          type: 'postgres',
          host: configService.get<string>('database.host'),
          port: configService.get<number>('database.port'),
          username: configService.get<string>('database.username'),
          password: configService.get<string>('database.password'),
          database: configService.get<string>('database.name'),

          entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
          migrations: [__dirname + '/../../database/migrations/*{.ts,.js}'],

          synchronize:
            configService.get<string>('app.nodeEnv') !== 'production',

          logging: configService.get<string>('app.nodeEnv') === 'development',

          autoLoadEntities: true,

          ssl: ssl,

          extra: ssl
            ? {
                ssl: {
                  rejectUnauthorized: false,
                },
              }
            : undefined,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
