import { PartialType } from '@nestjs/swagger';
import { CreateServiceDto } from './create-service.dto';

// Update dùng PartialType để mọi field đều optional nhưng vẫn giữ nguyên validation của CreateServiceDto.
export class UpdateServiceDto extends PartialType(CreateServiceDto) {}
