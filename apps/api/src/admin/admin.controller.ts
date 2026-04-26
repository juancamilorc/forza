import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateUserDto } from '@forza/shared';
import { UpdateUserDto } from '@forza/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/users')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  // GET /api/admin/users?role=trainer
  @Roles('super_admin', 'admin')
  @Get()
  findAll(@Query('role') role?: string) {
    return this.admin.findAll(role);
  }

  // GET /api/admin/users/:id
  @Roles('super_admin', 'admin')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.findOne(id);
  }

  // POST /api/admin/users
  @Roles('super_admin', 'admin')
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.admin.create(dto);
  }

  // PATCH /api/admin/users/:id
  @Roles('super_admin', 'admin')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.admin.update(id, dto);
  }

  // PATCH /api/admin/users/:id/toggle-active
  @Roles('super_admin', 'admin')
  @Patch(':id/toggle-active')
  toggleActive(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.toggleActive(id);
  }
}
