import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { RESPONSE_MESSAGES } from '../../common/constants/response-message.constant';
import { SettingsService } from './settings.service';

@ApiTags('User - Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all public website settings' })
  @ApiResponse({ status: 200 })
  async findPublic() {
    const data = await this.settingsService.findPublic();
    return { message: RESPONSE_MESSAGES.PUBLIC_SETTINGS_RETRIEVED, data };
  }
}
