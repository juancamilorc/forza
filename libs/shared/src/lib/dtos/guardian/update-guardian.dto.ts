import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateGuardianDto } from './create-guardian.dto';

export class UpdateGuardianDto extends PartialType(
  OmitType(CreateGuardianDto, ['athlete_id'] as const),
) {}
