import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { SettingsService } from './settings.service';

@ApiTags('User - Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get public website settings' })
  @ApiResponse({ status: 200 })
  findPublic() {
    return this.settingsService.findPublic();
  }
}
