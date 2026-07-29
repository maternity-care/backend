import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePregnantUserDto } from './create-pregnant-user.dto';

// Email/mật khẩu thuộc luồng xác thực riêng, không cập nhật lẫn trong hồ sơ cá nhân.
export class UpdateProfileDto extends PartialType(
  OmitType(CreatePregnantUserDto, ['email'] as const),
) {}
