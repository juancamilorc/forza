export class SessionResponseDto {
  id!:                   string;
  plan_id!:              string;
  trainer_id!:           string;
  athlete_id!:           string;
  session_number!:       number;
  session_date!:         string;
  session_time!:         string;
  location!:             string;
  status!:               string;
  confirmation_status!:  string;
  confirmed_by_trainer!: boolean;
  confirmed_by_guardian!:boolean;
  confirmation_token?:   string;
  token_expires_at?:     string;
  trainer_notes?:        string;
  created_at!:           string;
  updated_at!:           string;
}
