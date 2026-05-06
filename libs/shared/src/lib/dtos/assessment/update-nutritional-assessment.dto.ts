import { PartialType } from '@nestjs/mapped-types';
import { CreateNutritionalAssessmentDto } from './create-nutritional-assessment.dto';

export class UpdateNutritionalAssessmentDto extends PartialType(CreateNutritionalAssessmentDto) {}
