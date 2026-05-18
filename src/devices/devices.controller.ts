import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('lost')
  @UseGuards(JwtAuthGuard)
  async declareLost(@Req() req: any, @Body() dto: { deviceId: string; model: string; description?: string }) {
    return this.devicesService.declareLost(req.user.sub, dto);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async getMyDevices(@Req() req: any) {
    return this.devicesService.getMyDevices(req.user.sub);
  }

  @Get('lost-ids')
  async getLostBLEIds() {
    return this.devicesService.getLostBLEIds();
  }

  @Get('stats')
  async getProtectedStats() {
    return this.devicesService.getProtectedStats();
  }

  @Get(':deviceId/history')
  @UseGuards(JwtAuthGuard)
  async getDeviceHistory(@Req() req: any, @Param('deviceId') deviceId: string) {
    return this.devicesService.getDeviceHistory(req.user.sub, deviceId);
  }
}
