import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { DoctorResponseDto } from './dto/response/doctor-response.dto';
import { DoctorsService } from './doctors.service';

@ApiTags('Doctor Landing Page')
@Controller('doctors/landing-page')
export class LandingPageDoctorController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current doctor profile' })
  @ApiResponse({ status: 200, type: DoctorResponseDto })
  async getAll() {
    const doctor = await this.doctorsService.findAll({
      page: 1,
      limit: 10,
      sortYearsOfExperience: 'DESC',
    });
    return {
      message: 'Thành công',
      data: plainToInstance(DoctorResponseDto, doctor),
    };
  }

  @Get('/facility/:id')
  @ApiOperation({ summary: 'Get all doctors' })
  @ApiResponse({ status: 200, type: [DoctorResponseDto] })
  async findAll(@Param('id') id: string) {
    const doctors = await this.doctorsService.findAll({
      facilityId: id,
      page: 1,
      limit: 10,
      sortYearsOfExperience: 'DESC',
    });
    return {
      message: 'Thành công',
      data: {
        count: doctors.count,
        data: doctors?.data.map((doctor) => plainToInstance(DoctorResponseDto, doctor)),
      },
    };
  }
}
