import { PartialType } from '@nestjs/swagger';
import { CreateShiftSlotDto } from './create-shift-slot.dto';

export class UpdateShiftSlotDto extends PartialType(CreateShiftSlotDto) {}
