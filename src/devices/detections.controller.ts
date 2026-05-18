import { Controller, Post, Body } from '@nestjs/common';
import { DevicesService } from './devices.service';

@Controller('detections')
export class DetectionsController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  async reportDetection(
    @Body() dto: { bleId: string; lat: number; lng: number; accuracy: number; timestamp: number },
  ) {
    return this.devicesService.reportDetection(dto);
  }
}
