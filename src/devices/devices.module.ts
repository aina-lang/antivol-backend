import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from '../entities/device.entity';
import { Detection } from '../entities/detection.entity';
import { User } from '../entities/user.entity';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { DetectionsController } from './detections.controller';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device, Detection, User]),
    AuthModule,
    MailModule,
  ],
  providers: [DevicesService],
  controllers: [DevicesController, DetectionsController],
  exports: [DevicesService],
})
export class DevicesModule {}
