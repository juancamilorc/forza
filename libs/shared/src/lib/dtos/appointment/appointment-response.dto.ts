export class AppointmentResponseDto {
  id!:             string;
  trainer_id!:     string;
  athlete_id!:     string | null;
  type!:           string;
  status!:         string;
  scheduled_date!: string;
  scheduled_time!: string;
  location!:       string | null;
  notes!:          string | null;
  created_at!:     string;
  updated_at!:     string;
}
