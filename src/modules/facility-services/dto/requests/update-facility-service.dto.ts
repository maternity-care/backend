import { PartialType } from '@nestjs/swagger';
import { CreateFacilityServiceDto } from './create-facility-service.dto';

// Khi update mapping facility-service, không bắt buộc gửi lại toàn bộ field.
export class UpdateFacilityServiceDto extends PartialType(CreateFacilityServiceDto) {}
