import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProgramDto, ProgramComponentDto } from './create-program.dto';
import { SessionFrequency } from '../../../entities/program.entity';

export class UpdateProgramDto extends PartialType(CreateProgramDto) {
  @ApiPropertyOptional({
    type: [String],
    description: 'Array of medication UUIDs to assign to this program',
  })
  @IsArray()
  @IsOptional()
  medicationIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Array of healthcare staff UUIDs to assign to this program',
  })
  @IsArray()
  @IsOptional()
  staffIds?: string[];

  @ApiPropertyOptional({
    type: [ProgramComponentDto],
    description: 'Program components update payload',
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProgramComponentDto)
  components?: ProgramComponentDto[];

  @ApiPropertyOptional({
    enum: SessionFrequency,
    description: 'Session frequency override for the program',
  })
  @IsEnum(SessionFrequency)
  @IsOptional()
  sessionFreq?: SessionFrequency;
}
