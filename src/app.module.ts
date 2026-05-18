import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MailModule } from './mail/mail.module';
import { OtpModule } from './otp/otp.module';
import { AuthModule } from './auth/auth.module';
import { DevicesModule } from './devices/devices.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get<string>('DB_USERNAME', 'root'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE', 'antivol'),
        autoLoadEntities: true,
        synchronize: true, // auto-creates database tables based on entity definitions
      }),
    }),
    MailModule,
    OtpModule,
    AuthModule,
    DevicesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
