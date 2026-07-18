import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/constants/role.enum';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionEnum } from '../../common/constants/permission.enum';
import { UpdateDoctorDto } from './dto/requests/update-doctor.dto';
import { DoctorResponseDto } from './dto/response/doctor-response.dto';
import { DoctorsService } from './doctors.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AdminCreateUserDto } from '../users/dto/request/admin-create-user.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@ApiTags('Management - Doctors')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN)
@Controller('management/doctors')
export class ManagementDoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  @Permissions(PermissionEnum.DOCTOR_VIEW)
  @ApiOperation({ summary: 'List doctors' })
  @ApiResponse({ status: 200, type: [DoctorResponseDto] })
  async findAll() {
    const doctors = await this.doctorsService.findAll();
    return {
      message: 'Thành công',
      data: doctors.map((doctor) => plainToInstance(DoctorResponseDto, doctor)),
    };
  }

  @Get(':id')
  @Permissions(PermissionEnum.DOCTOR_VIEW)
  @ApiOperation({ summary: 'Get doctor detail' })
  @ApiResponse({ status: 200, type: DoctorResponseDto })
  async findOne(@Param('id') id: string) {
    const doctor = await this.doctorsService.findById(id);
    return {
      message: 'Thành công',
      data: plainToInstance(DoctorResponseDto, doctor),
    };
  }

  @Post()
  @Permissions(PermissionEnum.DOCTOR_CREATE)
  @ApiOperation({ summary: 'Create doctor' })
  @ApiResponse({ status: 201, type: DoctorResponseDto })
  async create(@Body() dto: AdminCreateUserDto, @CurrentUser() user: AuthenticatedUser) {
    const doctor = await this.doctorsService.create(dto, user);
    return {
      message: 'Tạo hồ sơ bác sĩ thành công',
      data: plainToInstance(DoctorResponseDto, doctor),
    };
  }

  @Patch(':id')
  @Permissions(PermissionEnum.DOCTOR_UPDATE)
  @ApiOperation({ summary: 'Update doctor' })
  @ApiResponse({ status: 200, type: DoctorResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdateDoctorDto) {
    const doctor = await this.doctorsService.update(id, dto);
    return {
      message: 'Cập nhật hồ sơ bác sĩ thành công',
      data: plainToInstance(DoctorResponseDto, doctor),
    };
  }

  @Delete(':id')
  @Permissions(PermissionEnum.DOCTOR_DELETE)
  @ApiOperation({ summary: 'Delete doctor' })
  async remove(@Param('id') id: string) {
    return {
      message: 'Xóa hồ sơ bác sĩ thành công',
      data: await this.doctorsService.remove(id),
    };
  }
}
