import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { VideosService } from './videos.service';
import { CreateVideoDto, UpdateVideoDto } from '@forza/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('videos')
export class VideosController {
  constructor(private readonly videos: VideosService) {}

  // GET /api/videos — trainers y admins pueden ver
  @Roles('super_admin', 'admin', 'trainer')
  @Get()
  findAll() {
    return this.videos.findAll();
  }

  // GET /api/videos/:id
  @Roles('super_admin', 'admin', 'trainer')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.videos.findOne(id);
  }

  // POST /api/videos — solo admin sube
  @Roles('super_admin', 'admin')
  @Post()
  create(@Body() dto: CreateVideoDto) {
    return this.videos.create(dto);
  }

  // PATCH /api/videos/:id
  @Roles('super_admin', 'admin')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVideoDto,
  ) {
    return this.videos.update(id, dto);
  }

  // DELETE /api/videos/:id
  @Roles('super_admin')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.videos.remove(id);
  }
}
