import { IsIn } from 'class-validator';
import { DEMO_ROLES, DemoRole } from './demo.config';

export class DemoLoginDto {
  @IsIn(DEMO_ROLES)
  role!: DemoRole;
}
