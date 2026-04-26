export class UserResponseDto {
  id!:         string;
  email!:      string;
  full_name!:  string;
  role!:       string;
  phone!:      string | null;
  avatar_url!: string | null;
  is_active!:  boolean;
  created_at!: string;
  updated_at!: string;
}
