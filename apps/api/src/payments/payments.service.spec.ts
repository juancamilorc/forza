import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockQuery: any = {
    select: jest.fn(),
    eq: jest.fn(),
    in: jest.fn(),
    order: jest.fn(),
    single: jest.fn(),
    then: jest.fn(),
  };

  const mockSupabaseService = { db: { from: jest.fn() } };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockQuery.select.mockReturnThis();
    mockQuery.eq.mockReturnThis();
    mockQuery.in.mockReturnThis();
    mockQuery.order.mockReturnThis();
    mockSupabaseService.db.from.mockReturnValue(mockQuery);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('findAllForTrainer — FOR-63', () => {
    it('devuelve solo los pagos de los deportistas del trainer', async () => {
      mockQuery.then
        .mockImplementationOnce((resolve: any) =>
          Promise.resolve({ data: [{ id: 'athlete-1' }, { id: 'athlete-2' }], error: null }).then(resolve),
        )
        .mockImplementationOnce((resolve: any) =>
          Promise.resolve({ data: [{ id: 'payment-1', athlete_id: 'athlete-1' }], error: null }).then(resolve),
        );

      const result = await service.findAllForTrainer('trainer-1');

      expect(mockSupabaseService.db.from).toHaveBeenCalledWith('athletes');
      expect(mockQuery.eq).toHaveBeenCalledWith('trainer_id', 'trainer-1');
      expect(mockQuery.in).toHaveBeenCalledWith('athlete_id', ['athlete-1', 'athlete-2']);
      expect(result).toEqual([{ id: 'payment-1', athlete_id: 'athlete-1' }]);
    });

    it('devuelve [] sin consultar payments si el trainer no tiene deportistas', async () => {
      mockQuery.then.mockImplementationOnce((resolve: any) =>
        Promise.resolve({ data: [], error: null }).then(resolve),
      );

      const result = await service.findAllForTrainer('trainer-sin-deportistas');

      expect(result).toEqual([]);
      expect(mockSupabaseService.db.from).not.toHaveBeenCalledWith('payments');
    });

    it('filtra además por athlete_id cuando se especifica', async () => {
      mockQuery.then
        .mockImplementationOnce((resolve: any) =>
          Promise.resolve({ data: [{ id: 'athlete-1' }, { id: 'athlete-2' }], error: null }).then(resolve),
        )
        .mockImplementationOnce((resolve: any) =>
          Promise.resolve({ data: [], error: null }).then(resolve),
        );

      await service.findAllForTrainer('trainer-1', 'athlete-2');

      expect(mockQuery.eq).toHaveBeenCalledWith('athlete_id', 'athlete-2');
    });
  });
});
