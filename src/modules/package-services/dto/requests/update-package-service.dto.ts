import { PartialType } from '@nestjs/swagger';
import { CreatePackageServiceDto } from './create-package-service.dto';

// Update dịch vụ trong gói cho phép gửi một phần field, nhưng field nào gửi vẫn bị validate.
export class UpdatePackageServiceDto extends PartialType(CreatePackageServiceDto) {}
