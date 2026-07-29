import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { trimText } from '../../../../common/helpers/dto-transform.helper';

export class SearchDoctorDto {
  @ApiPropertyOptional({ description: 'Free text search theo id, ma nhan vien hoac ten bac si' })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(100)
  search?: string;
}
