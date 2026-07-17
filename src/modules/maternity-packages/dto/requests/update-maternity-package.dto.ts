import { PartialType } from '@nestjs/swagger';
import { CreateMaternityPackageDto } from './create-maternity-package.dto';

// Update gói dùng PartialType để mọi field đều optional nhưng giữ nguyên rule validation khi field được gửi.
export class UpdateMaternityPackageDto extends PartialType(CreateMaternityPackageDto) {}
