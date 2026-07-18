import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/constants/role.enum';
import { UpdateDoctorDto } from './dto/requests/update-doctor.dto';
import { DoctorResponseDto } from './dto/response/doctor-response.dto';
import { DoctorsService } from './doctors.service';

@ApiTags('Doctor Profile')
@UseGuards(JwtAuthGuard)
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get('me')
  @Roles(RoleEnum.DOCTOR)
  @ApiOperation({ summary: 'Get current doctor profile' })
  @ApiResponse({ status: 200, type: DoctorResponseDto })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    const doctor = await this.doctorsService.findMine(user);
    return {
      message: 'Thành công',
      data: plainToInstance(DoctorResponseDto, doctor),
    };
  }

  @Patch('me')
  @Roles(RoleEnum.DOCTOR)
  @ApiOperation({ summary: 'Update current doctor profile' })
  @ApiResponse({ status: 200, type: DoctorResponseDto })
  async updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateDoctorDto) {
    const doctor = await this.doctorsService.updateMine(user, dto);
    return {
      message: 'Cập nhật hồ sơ bác sĩ thành công',
      data: plainToInstance(DoctorResponseDto, doctor),
    };
  }
}
