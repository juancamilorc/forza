import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SupabaseService } from '../supabase/supabase.service';
import { TrainerAvailabilityService } from '../trainer-availability/trainer-availability.service';
import { CreateSessionDto } from '@forza/shared';

describe('SessionsService', () => {
  let service: SessionsService;
  let mockAvailability: { assertAvailable: jest.Mock };

  // Query builder mock: chainable + thenable (para los `select(..., {head:true})`
  // y los `select().eq()` sin `.single()` que se resuelven con `await query`).
  const mockQuery: any = {
    select: jest.fn(),
    eq: jest.fn(),
    neq: jest.fn(),
    order: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    single: jest.fn(),
    then: jest.fn(),
  };

  const mockSupabaseService = { db: { from: jest.fn() } };

  // Helpers para encolar resoluciones sucesivas de `await query` (count o data/error)
  const queueThen = (value: unknown) =>
    mockQuery.then.mockImplementationOnce((resolve: any) => Promise.resolve(value).then(resolve));

  const activePlan = { total_sessions: 8, is_active: true, is_frozen: false };
  const paid       = { data: [{ status: 'pagado' }], error: null };
  const partial    = { data: [{ status: 'parcial' }], error: null };
  const unpaid     = { data: [{ status: 'pendiente' }], error: null };
  const noPayments = { data: [], error: null };

  const pendingSession = {
    id: 'session-1',
    plan_id: 'plan-1',
    trainer_id: 'trainer-1',
    athlete_id: 'athlete-1',
    session_date: '2026-09-15',
    session_time: '16:00',
    location: 'Cancha La 70',
    session_name: null,
    trainer_notes: null,
    status: 'pending',
    reschedule_count: 0,
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockQuery.select.mockReturnThis();
    mockQuery.eq.mockReturnThis();
    mockQuery.neq.mockReturnThis();
    mockQuery.order.mockReturnThis();
    mockQuery.insert.mockReturnThis();
    mockQuery.update.mockReturnThis();
    mockSupabaseService.db.from.mockReturnValue(mockQuery);
    mockAvailability = { assertAvailable: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: TrainerAvailabilityService, useValue: mockAvailability },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  const baseDto: CreateSessionDto = {
    athlete_id:   'athlete-1',
    session_date: '2026-09-15',
    session_time: '16:00',
    location:     'Cancha La 70',
  };

  // ── CREATE ──────────────────────────────────────────────────────

  describe('create — límite de cupo del plan (FOR-62)', () => {
    it('no valida cupo ni pago cuando la sesión no tiene plan_id (sesión extra)', async () => {
      queueThen({ count: 3 }); // count para session_number
      mockQuery.single.mockResolvedValue({ data: { id: 'session-1' }, error: null });

      await service.create({ ...baseDto, plan_id: null });

      expect(mockSupabaseService.db.from).not.toHaveBeenCalledWith('plans');
      expect(mockSupabaseService.db.from).not.toHaveBeenCalledWith('payments');
      expect(mockQuery.insert).toHaveBeenCalled();
    });

    it('crea la sesión cuando el plan tiene cupo y pago registrado', async () => {
      mockQuery.single.mockResolvedValueOnce({ data: activePlan, error: null }); // plan
      queueThen({ count: 5 });  // capacidad: 5 no canceladas de 8
      queueThen(partial);       // pago: parcial -> OK
      queueThen({ count: 5 });  // count para session_number
      mockQuery.single.mockResolvedValueOnce({ data: { id: 'session-1' }, error: null }); // insert

      await service.create({ ...baseDto, plan_id: 'plan-1' });

      expect(mockQuery.insert).toHaveBeenCalled();
    });

    it('rechaza la sesión cuando el plan ya tiene todas sus clases agendadas', async () => {
      mockQuery.single.mockResolvedValueOnce({ data: activePlan, error: null });
      queueThen({ count: 8 }); // 8 de 8 -> lleno

      await expect(service.create({ ...baseDto, plan_id: 'plan-1' })).rejects.toThrow(
        BadRequestException,
      );
      expect(mockQuery.insert).not.toHaveBeenCalled();
    });

    it('rechaza si el plan está congelado', async () => {
      mockQuery.single.mockResolvedValueOnce({
        data: { ...activePlan, is_frozen: true },
        error: null,
      });

      await expect(service.create({ ...baseDto, plan_id: 'plan-1' })).rejects.toThrow(
        'No se pueden agendar sesiones en un plan congelado',
      );
    });

    it('rechaza si el plan está inactivo', async () => {
      mockQuery.single.mockResolvedValueOnce({
        data: { ...activePlan, is_active: false },
        error: null,
      });

      await expect(service.create({ ...baseDto, plan_id: 'plan-1' })).rejects.toThrow(
        'No se pueden agendar sesiones en un plan inactivo',
      );
    });

    it('rechaza si el plan no existe', async () => {
      mockQuery.single.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });

      await expect(service.create({ ...baseDto, plan_id: 'plan-inexistente' })).rejects.toThrow(
        'El plan indicado no existe',
      );
    });
  });

  describe('create — validación de pago antes de agendar (FOR-76)', () => {
    it('rechaza si el plan no tiene ningún pago pagado/parcial', async () => {
      mockQuery.single.mockResolvedValueOnce({ data: activePlan, error: null });
      queueThen({ count: 2 });  // cupo libre
      queueThen(unpaid);        // solo 'pendiente'

      await expect(service.create({ ...baseDto, plan_id: 'plan-1' })).rejects.toThrow(
        'No se puede agendar ni confirmar sesiones sin un pago registrado para este plan',
      );
      expect(mockQuery.insert).not.toHaveBeenCalled();
    });

    it('rechaza si el plan no tiene ningún pago registrado', async () => {
      mockQuery.single.mockResolvedValueOnce({ data: activePlan, error: null });
      queueThen({ count: 2 });
      queueThen(noPayments);

      await expect(service.create({ ...baseDto, plan_id: 'plan-1' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('permite si el plan tiene al menos un pago pagado', async () => {
      mockQuery.single.mockResolvedValueOnce({ data: activePlan, error: null });
      queueThen({ count: 2 });
      queueThen(paid);
      queueThen({ count: 2 }); // session_number
      mockQuery.single.mockResolvedValueOnce({ data: { id: 'session-1' }, error: null });

      await service.create({ ...baseDto, plan_id: 'plan-1' });

      expect(mockQuery.insert).toHaveBeenCalled();
    });
  });

  // ── CONFIRM ─────────────────────────────────────────────────────

  describe('confirmByTrainer — validación de pago (FOR-76)', () => {
    it('rechaza confirmar si el plan no tiene pago', async () => {
      mockQuery.single.mockResolvedValueOnce({ data: pendingSession, error: null }); // findOne
      queueThen(unpaid);

      await expect(service.confirmByTrainer('session-1')).rejects.toThrow(
        'No se puede agendar ni confirmar sesiones sin un pago registrado para este plan',
      );
      expect(mockQuery.update).not.toHaveBeenCalled();
    });

    it('permite confirmar si el plan tiene un pago parcial', async () => {
      mockQuery.single.mockResolvedValueOnce({ data: pendingSession, error: null });
      queueThen(partial);
      mockQuery.single.mockResolvedValueOnce({ data: { ...pendingSession, status: 'completed' }, error: null });

      await service.confirmByTrainer('session-1');

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed' }),
      );
    });

    it('no valida pago para una sesión extra (sin plan_id)', async () => {
      mockQuery.single.mockResolvedValueOnce({ data: { ...pendingSession, plan_id: null }, error: null });
      mockQuery.single.mockResolvedValueOnce({ data: { id: 'session-1', status: 'completed' }, error: null });

      await service.confirmByTrainer('session-1');

      expect(mockSupabaseService.db.from).not.toHaveBeenCalledWith('payments');
      expect(mockQuery.update).toHaveBeenCalled();
    });
  });

  // ── VALIDACIÓN DE ESTADO (FOR-64) ──────────────────────────────

  describe('validación de estado — solo sesiones pending', () => {
    it('update rechaza si la sesión no está pending', async () => {
      mockQuery.single.mockResolvedValueOnce({
        data: { ...pendingSession, status: 'completed' },
        error: null,
      });

      await expect(service.update('session-1', { location: 'Otro' })).rejects.toThrow(
        'Solo se pueden editar sesiones en estado pendiente',
      );
    });

    it('update permite si la sesión está pending', async () => {
      mockQuery.single.mockResolvedValueOnce({ data: pendingSession, error: null }); // findOne
      mockQuery.single.mockResolvedValueOnce({ data: { ...pendingSession, location: 'Otro' }, error: null }); // update

      await service.update('session-1', { location: 'Otro' });

      expect(mockQuery.update).toHaveBeenCalled();
    });

    it('cancel rechaza si la sesión no está pending', async () => {
      mockQuery.single.mockResolvedValueOnce({
        data: { ...pendingSession, status: 'cancelled' },
        error: null,
      });

      await expect(service.cancel('session-1', 'usuario')).rejects.toThrow(
        'Solo se pueden cancelar sesiones en estado pendiente',
      );
    });

    it('cancel permite si la sesión está pending', async () => {
      mockQuery.single.mockResolvedValueOnce({ data: pendingSession, error: null });
      mockQuery.single.mockResolvedValueOnce({ data: { ...pendingSession, status: 'cancelled' }, error: null });

      await service.cancel('session-1', 'usuario');

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'cancelled' }),
      );
    });

    it('confirmByTrainer rechaza si la sesión no está pending', async () => {
      mockQuery.single.mockResolvedValueOnce({
        data: { ...pendingSession, status: 'completed' },
        error: null,
      });

      await expect(service.confirmByTrainer('session-1')).rejects.toThrow(
        'Solo se pueden confirmar sesiones en estado pendiente',
      );
    });
  });

  // ── RESCHEDULE (FOR-64) ────────────────────────────────────────

  describe('reschedule — corregido', () => {
    const rescheduleDto = {
      session_date: '2026-09-20',
      session_time: '10:00',
    };

    it('rechaza si la sesión no está pending', async () => {
      mockQuery.single.mockResolvedValueOnce({
        data: { ...pendingSession, status: 'completed' },
        error: null,
      });

      await expect(service.reschedule('session-1', rescheduleDto)).rejects.toThrow(
        'Solo se pueden reprogramar sesiones en estado pendiente',
      );
    });

    it('rechaza si ya se reprogramó 2 veces', async () => {
      mockQuery.single.mockResolvedValueOnce({
        data: { ...pendingSession, reschedule_count: 2 },
        error: null,
      });

      await expect(service.reschedule('session-1', rescheduleDto)).rejects.toThrow(
        'ya fue reprogramada el máximo de 2 veces',
      );
    });

    it('rechaza si el entrenador no está disponible (sin cancelar la original)', async () => {
      mockQuery.single.mockResolvedValueOnce({ data: pendingSession, error: null });
      mockAvailability.assertAvailable.mockRejectedValueOnce(
        new BadRequestException('El entrenador no atiende ese día'),
      );

      await expect(service.reschedule('session-1', rescheduleDto)).rejects.toThrow(
        'El entrenador no atiende ese día',
      );

      // La original NO debe haberse cancelado
      expect(mockQuery.update).not.toHaveBeenCalled();
    });

    it('rechaza si el plan no tiene pago (sin cancelar la original)', async () => {
      mockQuery.single.mockResolvedValueOnce({ data: pendingSession, error: null });
      queueThen(noPayments); // validatePlanHasPayment

      await expect(service.reschedule('session-1', rescheduleDto)).rejects.toThrow(
        'No se puede agendar ni confirmar sesiones sin un pago registrado',
      );

      // La original NO debe haberse cancelado
      expect(mockQuery.update).not.toHaveBeenCalled();
    });

    it('reprograma correctamente: cancela la original y crea la nueva', async () => {
      mockQuery.single.mockResolvedValueOnce({ data: pendingSession, error: null }); // findOne
      queueThen(paid); // validatePlanHasPayment
      // update (cancelar original) — devuelve via then (no .single)
      queueThen({ data: { ...pendingSession, status: 'cancelled' }, error: null });
      // insert (nueva sesión)
      mockQuery.single.mockResolvedValueOnce({
        data: { id: 'session-2', reschedule_count: 1, rescheduled_from: 'session-1' },
        error: null,
      });

      const result = await service.reschedule('session-1', rescheduleDto);

      expect(result.rescheduled_from).toBe('session-1');
      expect(result.reschedule_count).toBe(1);
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'cancelled' }),
      );
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          session_date: '2026-09-20',
          session_time: '10:00',
          trainer_id:   'trainer-1',    // copiado de la original
          athlete_id:   'athlete-1',    // copiado de la original
          plan_id:      'plan-1',       // copiado de la original
          location:     'Cancha La 70', // copiado de la original
        }),
      );
    });

    it('usa trainer_id y location del DTO si se proporcionan', async () => {
      mockQuery.single.mockResolvedValueOnce({ data: pendingSession, error: null });
      queueThen(paid);
      queueThen({ data: { ...pendingSession, status: 'cancelled' }, error: null });
      mockQuery.single.mockResolvedValueOnce({
        data: { id: 'session-2' },
        error: null,
      });

      await service.reschedule('session-1', {
        ...rescheduleDto,
        trainer_id: 'trainer-2',
        location: 'Cancha Otra',
      });

      expect(mockAvailability.assertAvailable).toHaveBeenCalledWith(
        'trainer-2', '2026-09-20', '10:00',
      );
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          trainer_id: 'trainer-2',
          location:   'Cancha Otra',
        }),
      );
    });

    it('sesión extra (sin plan_id): no valida pago, reprograma OK', async () => {
      const extraSession = { ...pendingSession, plan_id: null };
      mockQuery.single.mockResolvedValueOnce({ data: extraSession, error: null });
      // No debe llamar a validatePlanHasPayment
      queueThen({ data: { ...extraSession, status: 'cancelled' }, error: null });
      mockQuery.single.mockResolvedValueOnce({
        data: { id: 'session-2' },
        error: null,
      });

      await service.reschedule('session-1', rescheduleDto);

      expect(mockSupabaseService.db.from).not.toHaveBeenCalledWith('payments');
      expect(mockQuery.insert).toHaveBeenCalled();
    });
  });
});
