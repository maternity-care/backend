import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';
import { POSITIVE_ID_PATTERN } from '../../../rooms/dto/requests/create-room.dto';
import { CreateDoctorShiftDto } from './create-doctor-shift.dto';


//extends OmitType: dùng để tạo ra một lớp mới dựa trên lớp cha, 
// nhưng loại bỏ một số thuộc tính của lớp cha. 
// Trong trường hợp này, 
// CheckShiftConflictDto được tạo ra từ CreateDoctorShiftDto 
// nhưng loại bỏ các thuộc tính 'status' và 'maxAppointments'.
export class CheckShiftConflictDto extends OmitType(
  CreateDoctorShiftDto,
  ['status', 'maxAppointments'] as const,
) {
  @ApiPropertyOptional({ description: 'Bỏ qua ca này khi kiểm tra lúc update' })
  @IsOptional()
  @IsString()
  @Matches(POSITIVE_ID_PATTERN)
  excludeShiftId?: string;
}
