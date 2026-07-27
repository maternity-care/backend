import { PartialType } from '@nestjs/swagger';
import { CreatePregnantUserDto } from './create-pregnant-user.dto';

// Email không được cập nhật ở hồ sơ vì còn là định danh đăng nhập trong user_auths.
export class UpdatePregnantUserDto extends PartialType(CreatePregnantUserDto) {
  email?: never;
}
