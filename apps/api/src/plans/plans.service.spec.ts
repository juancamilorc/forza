import { Test, TestingModule } from '@nestjs/testing';
import { PlansService } from './plans.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreatePlanDto, PlanType } from '@forza/shared';

describe('PlansService', () => {
  let service: PlansService;

  // Query builder mock: chainable + thenable (so `await query` resolves).
  const mockQuery: any = {
    select: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    single: jest.fn(),
    then: jest.fn(),
  };

  const mockSupabaseService = { db: { from: jest.fn() } };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockQuery.select.mockReturnThis();
    mockQuery.eq.mockReturnThis();
    mockQuery.order.mockReturnThis();
    mockQuery.insert.mockReturnThis();
    mockQuery.update.mockReturnThis();
    mockQuery.then.mockImplementation((resolve: any) =>
      Promise.resolve({ error: null }).then(resolve),
    );
    mockSupabaseService.db.from.mockReturnValue(mockQuery);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlansService,
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    service = module.get<PlansService>(PlansService);
  });

  describe('create — end_date', () => {
    const baseDto: CreatePlanDto = {
      athlete_id: 'athlete-1',
      plan_type: PlanType.MOMENTUM,
      total_sessions: 12,
      start_date: '2026-09-03',
    };

    beforeEach(() => {
      mockQuery.single.mockResolvedValue({ data: { id: 'plan-1' }, error: null });
    });

    it('sets end_date = start_date + 1 month + 1 week', async () => {
      await service.create(baseDto);

      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({ start_date: '2026-09-03', end_date: '2026-10-10' }),
      );
    });

    it('is uniform regardless of plan_type', async () => {
      await service.create({ ...baseDto, plan_type: PlanType.ELITE_PRO });

      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({ end_date: '2026-10-10' }),
      );
    });

    it('clamps to the last day of the target month when the day does not exist', async () => {
      await service.create({ ...baseDto, start_date: '2026-01-31' });

      // 31-ene + 1 mes -> 28-feb (2026 no bisiesto), + 7 días -> 07-mar
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({ end_date: '2026-03-07' }),
      );
    });
  });

  describe('update — end_date', () => {
    beforeEach(() => {
      // findOne().single(), luego update()...single()
      mockQuery.single
        .mockResolvedValueOnce({ data: { id: 'plan-1' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'plan-1' }, error: null });
    });

    it('recalculates end_date when start_date changes', async () => {
      await service.update('plan-1', { start_date: '2026-09-03' });

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ start_date: '2026-09-03', end_date: '2026-10-10' }),
      );
    });

    it('does not touch end_date when start_date is not part of the update', async () => {
      await service.update('plan-1', { total_sessions: 16 });

      const payload = mockQuery.update.mock.calls[0][0];
      expect(payload).not.toHaveProperty('end_date');
      expect(payload).toEqual({ total_sessions: 16 });
    });
  });
});
