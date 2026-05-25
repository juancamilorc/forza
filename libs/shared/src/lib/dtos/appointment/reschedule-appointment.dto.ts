import { IsDateString, IsString, IsNotEmpty } from 'class-validator';

export class RescheduleAppointmentDto {
  @IsDateString()
  @IsNotEmpty()
  scheduled_date!: string;

  @IsString()
  @IsNotEmpty()
  scheduled_time!: string;
}
