import { PartialType } from '@nestjs/mapped-types';
import { CreateTechnicalAssessmentDto } from './create-technical-assessment.dto';

export class UpdateTechnicalAssessmentDto extends PartialType(CreateTechnicalAssessmentDto) {}
