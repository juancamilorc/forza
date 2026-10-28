import { PartialType } from '@nestjs/mapped-types';
import { CreateTrialSessionDto } from './create-trial-session.dto';

export class UpdateTrialSessionDto extends PartialType(CreateTrialSessionDto) {}
