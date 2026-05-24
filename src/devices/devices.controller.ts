import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard)
  async registerDevice(@Req() req: any, @Body() dto: { deviceId: string; model: string; expoPushToken?: string; forceReplace?: boolean }) {
    return this.devicesService.registerDevice(req.user.sub, dto);
  }

  @Post('lost')
  @UseGuards(JwtAuthGuard)
  async declareLost(@Req() req: any, @Body() dto: { description?: string }) {
    return this.devicesService.declareLost(req.user.sub, dto);
  }

  @Post('secure')
  @UseGuards(JwtAuthGuard)
  async declareSecured(@Req() req: any) {
    return this.devicesService.declareSecured(req.user.sub);
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
