import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CreateNutritionalAssessmentDto,
  UpdateNutritionalAssessmentDto,
  CreateTechnicalAssessmentDto,
  UpdateTechnicalAssessmentDto,
  CreatePhysicalAssessmentDto,
  UpdatePhysicalAssessmentDto,
} from '@forza/shared';

@Injectable()
export class AssessmentsService {
  constructor(private supabase: SupabaseService) {}

  // ════════════════════════════════════════════════════════════
  // CÁLCULOS NUTRICIONALES AUTOMÁTICOS
  // ════════════════════════════════════════════════════════════

  private calcularNutricional(dto: CreateNutritionalAssessmentDto, sexo: string) {
    const {
      peso_kg, talla_cm, perimetro_muneca_cm,
      pliegue_tricipital_mm, pliegue_subescapular_mm,
      pliegue_supraespinal_mm, pliegue_abdominal_mm,
      pliegue_muslo_mm, pliegue_pantorrilla_mm,
      porcentaje_grasa_deseado,
    } = dto;

    if (!peso_kg || !talla_cm) return {};

    const talla_m = talla_cm / 100;

    // Sumatoria de 6 pliegues
    const sumatoria_pliegues_mm =
      (pliegue_tricipital_mm    ?? 0) +
      (pliegue_subescapular_mm  ?? 0) +
      (pliegue_supraespinal_mm  ?? 0) +
      (pliegue_abdominal_mm     ?? 0) +
      (pliegue_muslo_mm         ?? 0) +
      (pliegue_pantorrilla_mm   ?? 0);

    // % Grasa — Ecuación de Yuhaz
    const porcentaje_grasa = sexo === 'M'
      ? 0.1051 * sumatoria_pliegues_mm + 2.585
      : 0.1548 * sumatoria_pliegues_mm + 3.58;

    // Peso graso y masa libre de grasa
    const peso_graso_kg        = peso_kg * (porcentaje_grasa / 100);
    const masa_libre_grasa_kg  = peso_kg - peso_graso_kg;

    // IAKS
    const iaks = (masa_libre_grasa_kg * 100000) / Math.pow(talla_cm, 3);

    // IMLG
    const imlg = masa_libre_grasa_kg / Math.pow(talla_m, 2);

    // IMC
    const imc = peso_kg / Math.pow(talla_m, 2);

    // Complexión ósea
    const complexion_osea = perimetro_muneca_cm
      ? talla_cm / perimetro_muneca_cm
      : null;

    // Peso ideal
    const peso_ideal_kg = porcentaje_grasa_deseado
      ? masa_libre_grasa_kg / (1 - porcentaje_grasa_deseado / 100)
      : null;

    return {
      sumatoria_pliegues_mm:  Math.round(sumatoria_pliegues_mm * 100) / 100,
      porcentaje_grasa:       Math.round(porcentaje_grasa * 100) / 100,
      peso_graso_kg:          Math.round(peso_graso_kg * 100) / 100,
      masa_libre_grasa_kg:    Math.round(masa_libre_grasa_kg * 100) / 100,
      iaks:                   Math.round(iaks * 1000) / 1000,
      imlg:                   Math.round(imlg * 100) / 100,
      imc:                    Math.round(imc * 100) / 100,
      complexion_osea:        complexion_osea
                                ? Math.round(complexion_osea * 100) / 100
                                : null,
      peso_ideal_kg:          peso_ideal_kg
                                ? Math.round(peso_ideal_kg * 100) / 100
                                : null,
    };
  }

  // ════════════════════════════════════════════════════════════
  // CÁLCULOS TÉCNICOS AUTOMÁTICOS
  // ════════════════════════════════════════════════════════════

  /**
   * Valida que ningún score de un test supere el número de intentos
   * configurado para ese test (regla cruzada, no expresable en el DTO).
   */
  private validarIntentos(dto: CreateTechnicalAssessmentDto) {
    const controlIntentos = dto.control_intentos ?? 2;
    const paseIntentos = dto.pase_intentos ?? 4;
    const definicionIntentos = dto.definicion_intentos ?? 2;

    const checks: [string, number | undefined, number][] = [
      ['control_rastrero_dr', dto.control_rastrero_dr, controlIntentos],
      ['control_rastrero_iz', dto.control_rastrero_iz, controlIntentos],
      ['control_media_altura_dr', dto.control_media_altura_dr, controlIntentos],
      ['control_media_altura_iz', dto.control_media_altura_iz, controlIntentos],
      ['control_alto_dr', dto.control_alto_dr, controlIntentos],
      ['control_alto_iz', dto.control_alto_iz, controlIntentos],
      ['pase_derecha', dto.pase_derecha, paseIntentos],
      ['pase_izquierda', dto.pase_izquierda, paseIntentos],
      ['definicion_carril_der_dr', dto.definicion_carril_der_dr, definicionIntentos],
      ['definicion_carril_der_iz', dto.definicion_carril_der_iz, definicionIntentos],
      ['definicion_carril_cen_dr', dto.definicion_carril_cen_dr, definicionIntentos],
      ['definicion_carril_cen_iz', dto.definicion_carril_cen_iz, definicionIntentos],
      ['definicion_carril_izq_dr', dto.definicion_carril_izq_dr, definicionIntentos],
      ['definicion_carril_izq_iz', dto.definicion_carril_izq_iz, definicionIntentos],
    ];

    for (const [campo, valor, intentos] of checks) {
      if (valor !== undefined && valor > intentos) {
        throw new BadRequestException(
          `${campo} (${valor}) no puede superar el número de intentos configurado (${intentos})`,
        );
      }
    }
  }

  private calcularTecnico(dto: CreateTechnicalAssessmentDto) {
    this.validarIntentos(dto);

    const resultados: Record<string, number | null> = {};

    const controlIntentos = dto.control_intentos ?? 2;
    const paseIntentos = dto.pase_intentos ?? 4;
    const definicionIntentos = dto.definicion_intentos ?? 2;

    // % efectividad control de balón
    const totalBalones =
      (dto.control_rastrero_dr    ?? 0) + (dto.control_rastrero_iz    ?? 0) +
      (dto.control_media_altura_dr ?? 0) + (dto.control_media_altura_iz ?? 0) +
      (dto.control_alto_dr        ?? 0) + (dto.control_alto_iz        ?? 0);

    const totalDerecha =
      (dto.control_rastrero_dr    ?? 0) +
      (dto.control_media_altura_dr ?? 0) +
      (dto.control_alto_dr        ?? 0);

    const totalIzquierda =
      (dto.control_rastrero_iz    ?? 0) +
      (dto.control_media_altura_iz ?? 0) +
      (dto.control_alto_iz        ?? 0);

    resultados.control_efectividad_derecha_pct   = Math.round((totalDerecha / (3 * controlIntentos)) * 100);
    resultados.control_efectividad_izquierda_pct = Math.round((totalIzquierda / (3 * controlIntentos)) * 100);
    resultados.control_efectividad_total_pct     = Math.round((totalBalones / (6 * controlIntentos)) * 100);

    // % efectividad pase
    if (dto.pase_derecha !== undefined && dto.pase_izquierda !== undefined) {
      const totalPase = dto.pase_derecha + dto.pase_izquierda;
      resultados.pase_efectividad_pct = Math.round((totalPase / (2 * paseIntentos)) * 100);
    }

    // % efectividad definición
    const totalDefinicion =
      (dto.definicion_carril_der_dr ?? 0) + (dto.definicion_carril_der_iz ?? 0) +
      (dto.definicion_carril_cen_dr ?? 0) + (dto.definicion_carril_cen_iz ?? 0) +
      (dto.definicion_carril_izq_dr ?? 0) + (dto.definicion_carril_izq_iz ?? 0);

    const definicionDerecha =
      (dto.definicion_carril_der_dr ?? 0) +
      (dto.definicion_carril_cen_dr ?? 0) +
      (dto.definicion_carril_izq_dr ?? 0);

    const definicionIzquierda =
      (dto.definicion_carril_der_iz ?? 0) +
      (dto.definicion_carril_cen_iz ?? 0) +
      (dto.definicion_carril_izq_iz ?? 0);

    resultados.definicion_efectividad_dr_pct    = Math.round((definicionDerecha / (3 * definicionIntentos)) * 100);
    resultados.definicion_efectividad_iz_pct    = Math.round((definicionIzquierda / (3 * definicionIntentos)) * 100);
    resultados.definicion_efectividad_total_pct = Math.round((totalDefinicion / (6 * definicionIntentos)) * 100);

    return resultados;
  }

  // ════════════════════════════════════════════════════════════
  // CLASIFICACIÓN SALTOS POR EDAD Y SEXO
  // ════════════════════════════════════════════════════════════

  private clasificarSalto(
    tipo: 'vertical' | 'horizontal',
    valor: number,
    edad: number,
    sexo: string,
  ): string {
    // Tablas de referencia FUPRECOL (niños/adolescentes)
    const tablas: Record<string, Record<string, Record<string, number[]>>> = {
      vertical: {
        '8-10':  { M: [21, 24, 28, 31], F: [19, 22, 25, 28] },
        '11-12': { M: [26, 30, 34, 38], F: [23, 27, 30, 33] },
        '13-14': { M: [31, 35, 40, 45], F: [24, 27, 30, 33] },
        '15-17': { M: [33, 38, 43, 48], F: [24, 27, 30, 34] },
      },
      horizontal: {
        '8-10':  { M: [120, 135, 150, 165], F: [105, 120, 135, 150] },
        '11-12': { M: [140, 155, 170, 185], F: [120, 135, 150, 165] },
        '13-14': { M: [165, 180, 195, 210], F: [135, 150, 165, 180] },
        '15-17': { M: [180, 200, 220, 240], F: [145, 165, 180, 195] },
      },
    };

    // Adultos (>17 años)
    if (edad > 17) {
      if (tipo === 'vertical') {
        const limites = sexo === 'M'
          ? [31, 41, 51, 61, 70]
          : [21, 31, 41, 51, 60];
        if (valor < limites[0]) return 'debajo_promedio';
        if (valor < limites[2]) return 'promedio';
        if (valor < limites[4]) return 'bueno';
        return 'excelente';
      }
      return 'promedio'; // horizontal adultos sin tabla específica
    }

    // Seleccionar rango de edad
    let rangoKey = '15-17';
    if (edad >= 8  && edad <= 10) rangoKey = '8-10';
    if (edad >= 11 && edad <= 12) rangoKey = '11-12';
    if (edad >= 13 && edad <= 14) rangoKey = '13-14';

    const s = sexo === 'M' ? 'M' : 'F';
    const limites = tablas[tipo]?.[rangoKey]?.[s];
    if (!limites) return 'promedio';

    const [debajo, promedio, bueno, excelente] = limites;
    if (valor < debajo)   return 'debajo_promedio';
    if (valor < promedio) return 'promedio';
    if (valor < bueno)    return 'bueno';
    return 'excelente';
  }

  // ════════════════════════════════════════════════════════════
  // NUTRICIONAL — CRUD
  // ════════════════════════════════════════════════════════════

  async findAllNutritional(athleteId?: string) {
    let query = this.supabase.db
      .from('nutritional_assessments')
      .select('*, athletes(id, first_name, last_name)')
      .order('evaluation_date', { ascending: false });

    if (athleteId) query = query.eq('athlete_id', athleteId);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findOneNutritional(id: string) {
    const { data, error } = await this.supabase.db
      .from('nutritional_assessments')
      .select('*, athletes(id, first_name, last_name, birth_date, gender), evaluator:users!evaluator_id(id, full_name)')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException(`Evaluación nutricional ${id} no encontrada`);
    return data;
  }

  async createNutritional(dto: CreateNutritionalAssessmentDto) {
    // Obtener sexo del deportista para las fórmulas
    const { data: athlete } = await this.supabase.db
      .from('athletes')
      .select('gender, birth_date')
      .eq('id', dto.athlete_id)
      .single();

    const sexo = athlete?.gender ?? 'M';
    const calculos = this.calcularNutricional(dto, sexo);

    const { data, error } = await this.supabase.db
      .from('nutritional_assessments')
      .insert({ ...dto, ...calculos })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateNutritional(id: string, dto: UpdateNutritionalAssessmentDto) {
    await this.findOneNutritional(id);

    const { data: assessment } = await this.supabase.db
      .from('nutritional_assessments')
      .select('athlete_id')
      .eq('id', id)
      .single();

    if (!assessment) throw new NotFoundException(`Evaluación ${id} no encontrada`);

    const { data: athlete } = await this.supabase.db
      .from('athletes')
      .select('gender')
      .eq('id', assessment.athlete_id)
      .single();

    const sexo = athlete?.gender ?? 'M';
    const calculos = this.calcularNutricional(dto as any, sexo);

    const { data, error } = await this.supabase.db
      .from('nutritional_assessments')
      .update({ ...dto, ...calculos })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ════════════════════════════════════════════════════════════
  // TÉCNICA — CRUD
  // ════════════════════════════════════════════════════════════

  async findAllTechnical(athleteId?: string) {
    let query = this.supabase.db
      .from('technical_assessments')
      .select('*, athletes(id, first_name, last_name)')
      .order('evaluation_date', { ascending: false });

    if (athleteId) query = query.eq('athlete_id', athleteId);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findOneTechnical(id: string) {
    const { data, error } = await this.supabase.db
      .from('technical_assessments')
      .select('*, athletes(id, first_name, last_name), evaluator:users!evaluator_id(id, full_name)')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException(`Evaluación técnica ${id} no encontrada`);
    return data;
  }

  async createTechnical(dto: CreateTechnicalAssessmentDto) {
    const calculos = this.calcularTecnico(dto);

    const { data, error } = await this.supabase.db
      .from('technical_assessments')
      .insert({ ...dto, ...calculos })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateTechnical(id: string, dto: UpdateTechnicalAssessmentDto) {
    await this.findOneTechnical(id);

    const calculos = this.calcularTecnico(dto as any);

    const { data, error } = await this.supabase.db
      .from('technical_assessments')
      .update({ ...dto, ...calculos })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ════════════════════════════════════════════════════════════
  // FÍSICA — CRUD
  // ════════════════════════════════════════════════════════════

  async findAllPhysical(athleteId?: string) {
    let query = this.supabase.db
      .from('physical_assessments')
      .select('*, athletes(id, first_name, last_name)')
      .order('evaluation_date', { ascending: false });

    if (athleteId) query = query.eq('athlete_id', athleteId);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findOnePhysical(id: string) {
    const { data, error } = await this.supabase.db
      .from('physical_assessments')
      .select('*, athletes(id, first_name, last_name, birth_date, gender), evaluator:users!evaluator_id(id, full_name)')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException(`Evaluación física ${id} no encontrada`);
    return data;
  }

  /**
   * Si llegan intentos de salto (1-4), el resultado clasificable es el mejor
   * (valor máximo) de esos intentos — reemplaza el cm manual si se envían ambos.
   */
  private mejorSalto(valores: number[] | undefined, cmManual: number | undefined) {
    if (valores && valores.length > 0) return Math.max(...valores);
    return cmManual;
  }

  async createPhysical(dto: CreatePhysicalAssessmentDto) {
    const { data: athlete } = await this.supabase.db
      .from('athletes')
      .select('birth_date, gender')
      .eq('id', dto.athlete_id)
      .single();

    const edad = athlete?.birth_date
      ? Math.floor((Date.now() - new Date(athlete.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365))
      : 18;
    const sexo = athlete?.gender ?? 'M';

    const salto_vertical_cm   = this.mejorSalto(dto.salto_vertical_valores, dto.salto_vertical_cm);
    const salto_horizontal_cm = this.mejorSalto(dto.salto_horizontal_valores, dto.salto_horizontal_cm);

    // Clasificación automática de saltos (con el mejor intento)
    const salto_vertical_clasificacion = salto_vertical_cm
      ? this.clasificarSalto('vertical', salto_vertical_cm, edad, sexo)
      : undefined;

    const salto_horizontal_clasificacion = salto_horizontal_cm
      ? this.clasificarSalto('horizontal', salto_horizontal_cm, edad, sexo)
      : undefined;

    const { data, error } = await this.supabase.db
      .from('physical_assessments')
      .insert({
        ...dto,
        salto_vertical_cm:              salto_vertical_cm   ?? dto.salto_vertical_cm,
        salto_horizontal_cm:            salto_horizontal_cm ?? dto.salto_horizontal_cm,
        salto_vertical_clasificacion:   salto_vertical_clasificacion   ?? dto.salto_vertical_clasificacion,
        salto_horizontal_clasificacion: salto_horizontal_clasificacion ?? dto.salto_horizontal_clasificacion,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updatePhysical(id: string, dto: UpdatePhysicalAssessmentDto) {
    const existing = await this.findOnePhysical(id);

    const edad = existing.athletes?.birth_date
      ? Math.floor((Date.now() - new Date(existing.athletes.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365))
      : 18;
    const sexo = existing.athletes?.gender ?? 'M';

    const salto_vertical_cm   = this.mejorSalto(dto.salto_vertical_valores, dto.salto_vertical_cm);
    const salto_horizontal_cm = this.mejorSalto(dto.salto_horizontal_valores, dto.salto_horizontal_cm);

    const salto_vertical_clasificacion = salto_vertical_cm
      ? this.clasificarSalto('vertical', salto_vertical_cm, edad, sexo)
      : undefined;

    const salto_horizontal_clasificacion = salto_horizontal_cm
      ? this.clasificarSalto('horizontal', salto_horizontal_cm, edad, sexo)
      : undefined;

    const { data, error } = await this.supabase.db
      .from('physical_assessments')
      .update({
        ...dto,
        ...(salto_vertical_cm             !== undefined && { salto_vertical_cm }),
        ...(salto_horizontal_cm           !== undefined && { salto_horizontal_cm }),
        ...(salto_vertical_clasificacion   && { salto_vertical_clasificacion }),
        ...(salto_horizontal_clasificacion && { salto_horizontal_clasificacion }),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
