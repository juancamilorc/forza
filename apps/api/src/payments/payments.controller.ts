import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentDto } from '@forza/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  // GET /api/payments?athlete_id=uuid
  @Roles('super_admin', 'admin')
  @Get()
  findAll(@Query('athlete_id') athleteId?: string) {
    return this.payments.findAll(athleteId);
  }

  // GET /api/payments/:id
  @Roles('super_admin', 'admin')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.payments.findOne(id);
  }

  // POST /api/payments
  @Roles('super_admin', 'admin')
  @Post()
  create(@Body() dto: CreatePaymentDto) {
    return this.payments.create(dto);
  }

  // PATCH /api/payments/:id
  @Roles('super_admin', 'admin')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.payments.update(id, dto);
  }

  // PATCH /api/payments/:id/abonar
  @Roles('super_admin', 'admin')
  @Patch(':id/abonar')
  addPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('abono') abono: number,
  ) {
    return this.payments.addPayment(id, abono);
  }

  // DELETE /api/payments/:id
  @Roles('super_admin')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.payments.remove(id);
  }
}
