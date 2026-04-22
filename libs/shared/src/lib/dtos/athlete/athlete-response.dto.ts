export class AthleteResponseDto {
  id!:          string;
  first_name!:  string;
  last_name!:   string;
  birth_date!:  string;
  status!:      string;
  trainer_id!:  string | null;
  photo_url!:   string | null;
  notes!:       string | null;
  created_at!:  string;
  updated_at!:  string;
  age?:         number;
}
