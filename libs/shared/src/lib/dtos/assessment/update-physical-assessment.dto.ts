import { PartialType } from '@nestjs/mapped-types';
import { CreatePhysicalAssessmentDto } from './create-physical-assessment.dto';

export class UpdatePhysicalAssessmentDto extends PartialType(CreatePhysicalAssessmentDto) {}
