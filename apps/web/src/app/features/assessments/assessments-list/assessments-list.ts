import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  AssessmentsService,
  NutritionalAssessment,
  TechnicalAssessment,
  PhysicalAssessment,
} from '../../../core/services/assessments.service';

export type AssessmentType = 'nutritional' | 'technical' | 'physical';

export interface AssessmentRow {
  id:              string;
  type:            AssessmentType;
  athlete_id:      string;
  athlete_name:    string;
  evaluation_date: string;
  period_label:    string | null;
  metric1:         string;
  metric2:         string;
  raw:             NutritionalAssessment | TechnicalAssessment | PhysicalAssessment;
}

interface CompareField {
  label: string;
  a:     number | null;
  b:     number | null;
  unit:  string;
  higherIsBetter: boolean;
}

interface EvoPoint  { date: string; shortDate: string; value: number; }
interface EvoSeries { label: string; unit: string; higherIsBetter: boolean; points: EvoPoint[]; }

@Component({
  selector: 'app-assessments-list',
  imports: [],
  templateUrl: './assessments-list.html',
  styleUrl: './assessments-list.scss',
})
export class AssessmentsList implements OnInit {
  private svc    = inject(AssessmentsService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);

  loading         = signal(true);
  filterType      = signal<AssessmentType | 'all'>('all');
  filterAthleteId = signal<string | null>(null);
  searchText      = signal('');

  // Comparación
  compareA = signal<string | null>(null);
  compareB = signal<string | null>(null);

  // Evolución
  evoMode = signal(false);

  private allRows = signal<AssessmentRow[]>([]);

  filterAthleteName = computed(() => {
    const id = this.filterAthleteId();
    if (!id) return null;
    return this.allRows().find(r => r.athlete_id === id)?.athlete_name ?? null;
  });

  filteredRows = computed(() => {
    let rows = this.allRows();
    if (this.filterType() !== 'all') {
      rows = rows.filter(r => r.type === this.filterType());
    }
    const athleteId = this.filterAthleteId();
    if (athleteId) rows = rows.filter(r => r.athlete_id === athleteId);
    const q = this.searchText().toLowerCase().trim();
    if (q) rows = rows.filter(r => r.athlete_name.toLowerCase().includes(q));
    return rows;
  });

  // Vista agrupada: solo cuando hay filtro de deportista
  isGrouped = computed(() => !!this.filterAthleteId());

  groupedNutri = computed(() =>
    this.filteredRows().filter(r => r.type === 'nutritional')
  );
  groupedTech = computed(() =>
    this.filteredRows().filter(r => r.type === 'technical')
  );
  groupedPhys = computed(() =>
    this.filteredRows().filter(r => r.type === 'physical')
  );

  // ── Evolución (gráficos) ──────────────────────────────────────
  private toEvoPoints(rows: AssessmentRow[], fn: (r: NutritionalAssessment | TechnicalAssessment | PhysicalAssessment) => number | null): EvoPoint[] {
    return rows
      .map(r => ({ date: r.evaluation_date, value: fn(r.raw) }))
      .filter((p): p is { date: string; value: number } => p.value != null)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(p => ({
        date: p.date,
        shortDate: new Date(p.date + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }),
        value: p.value,
      }));
  }

  evoNutri = computed<EvoSeries[]>(() => {
    const rows = this.groupedNutri();
    if (rows.length < 2) return [];
    return [
      { label: '% Grasa',    unit: '%',  higherIsBetter: false, points: this.toEvoPoints(rows, r => (r as NutritionalAssessment).porcentaje_grasa) },
      { label: 'IAKS',       unit: '',   higherIsBetter: true,  points: this.toEvoPoints(rows, r => (r as NutritionalAssessment).iaks) },
      { label: 'IMC',        unit: '',   higherIsBetter: false, points: this.toEvoPoints(rows, r => (r as NutritionalAssessment).imc) },
      { label: 'Peso',       unit: 'kg', higherIsBetter: false, points: this.toEvoPoints(rows, r => (r as NutritionalAssessment).peso_kg) },
    ].filter(s => s.points.length >= 2);
  });

  evoTech = computed<EvoSeries[]>(() => {
    const rows = this.groupedTech();
    if (rows.length < 2) return [];
    return [
      { label: 'Control',    unit: '%', higherIsBetter: true, points: this.toEvoPoints(rows, r => (r as TechnicalAssessment).control_efectividad_total_pct) },
      { label: 'Pase',       unit: '%', higherIsBetter: true, points: this.toEvoPoints(rows, r => (r as TechnicalAssessment).pase_efectividad_pct) },
      { label: 'Definición', unit: '%', higherIsBetter: true, points: this.toEvoPoints(rows, r => (r as TechnicalAssessment).definicion_efectividad_total_pct) },
    ].filter(s => s.points.length >= 2);
  });

  evoPhys = computed<EvoSeries[]>(() => {
    const rows = this.groupedPhys();
    if (rows.length < 2) return [];
    return [
      { label: 'Salto vertical',   unit: 'cm', higherIsBetter: true,  points: this.toEvoPoints(rows, r => (r as PhysicalAssessment).salto_vertical_cm) },
      { label: 'Salto horizontal', unit: 'cm', higherIsBetter: true,  points: this.toEvoPoints(rows, r => (r as PhysicalAssessment).salto_horizontal_cm) },
      { label: 'Sprint 20m',       unit: 's',  higherIsBetter: false, points: this.toEvoPoints(rows, r => (r as PhysicalAssessment).sprint_20m) },
    ].filter(s => s.points.length >= 2);
  });

  hasEvoData = computed(() =>
    this.evoNutri().length > 0 || this.evoTech().length > 0 || this.evoPhys().length > 0
  );

  // ── SVG helpers ───────────────────────────────────────────────
  readonly chartW = 260;
  readonly chartH = 90;
  readonly chartPadX = 24;
  readonly chartPadY = 18;

  svgX(i: number, total: number): number {
    if (total === 1) return this.chartW / 2;
    return this.chartPadX + (i / (total - 1)) * (this.chartW - this.chartPadX * 2);
  }

  svgY(value: number, min: number, max: number): number {
    const h = this.chartH - this.chartPadY * 2;
    if (max === min) return this.chartPadY + h / 2;
    return this.chartPadY + (1 - (value - min) / (max - min)) * h;
  }

  svgPath(series: EvoSeries): string {
    const pts = series.points;
    const vals = pts.map(p => p.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    return pts.map((p, i) =>
      (i === 0 ? 'M' : 'L') + this.svgX(i, pts.length).toFixed(1) + ' ' + this.svgY(p.value, min, max).toFixed(1)
    ).join(' ');
  }

  svgPoints(series: EvoSeries): { x: number; y: number; value: number; shortDate: string; isLast: boolean }[] {
    const pts  = series.points;
    const vals = pts.map(p => p.value);
    const min  = Math.min(...vals);
    const max  = Math.max(...vals);
    return pts.map((p, i) => ({
      x: this.svgX(i, pts.length),
      y: this.svgY(p.value, min, max),
      value: p.value,
      shortDate: p.shortDate,
      isLast: i === pts.length - 1,
    }));
  }

  trendClass(series: EvoSeries): string {
    const pts = series.points;
    if (pts.length < 2) return '';
    const diff = pts[pts.length - 1].value - pts[0].value;
    if (Math.abs(diff) < 0.01) return '';
    const improved = series.higherIsBetter ? diff > 0 : diff < 0;
    return improved ? 'trend-up' : 'trend-down';
  }

  // Panel de comparación
  comparisonType = computed<AssessmentType | null>(() => {
    const a = this.compareA();
    const b = this.compareB();
    if (!a || !b) return null;
    const rowA = this.allRows().find(r => r.id === a);
    return rowA?.type ?? null;
  });

  comparisonFields = computed<CompareField[]>(() => {
    const a = this.compareA();
    const b = this.compareB();
    if (!a || !b) return [];

    const rowA = this.allRows().find(r => r.id === a);
    const rowB = this.allRows().find(r => r.id === b);
    if (!rowA || !rowB || rowA.type !== rowB.type) return [];

    // Ordenar: A = más antigua, B = más reciente
    const [older, newer] = rowA.evaluation_date <= rowB.evaluation_date
      ? [rowA, rowB] : [rowB, rowA];

    const type = rowA.type;

    if (type === 'nutritional') {
      const o = older.raw as NutritionalAssessment;
      const n = newer.raw as NutritionalAssessment;
      return [
        { label: 'Peso',           a: o.peso_kg,              b: n.peso_kg,              unit: 'kg',  higherIsBetter: false },
        { label: 'IMC',            a: o.imc,                  b: n.imc,                  unit: '',    higherIsBetter: false },
        { label: '% Grasa',        a: o.porcentaje_grasa,     b: n.porcentaje_grasa,     unit: '%',   higherIsBetter: false },
        { label: 'IAKS',           a: o.iaks,                 b: n.iaks,                 unit: '',    higherIsBetter: true  },
        { label: 'Masa libre grasa', a: (o as any).masa_libre_grasa_kg, b: (n as any).masa_libre_grasa_kg, unit: 'kg', higherIsBetter: true },
        { label: 'Pliegues sum.',  a: o.sumatoria_pliegues_mm, b: n.sumatoria_pliegues_mm, unit: 'mm', higherIsBetter: false },
      ];
    }

    if (type === 'technical') {
      const o = older.raw as TechnicalAssessment;
      const n = newer.raw as TechnicalAssessment;
      return [
        { label: 'Control',    a: o.control_efectividad_total_pct,    b: n.control_efectividad_total_pct,    unit: '%', higherIsBetter: true },
        { label: 'Pase',       a: o.pase_efectividad_pct,             b: n.pase_efectividad_pct,             unit: '%', higherIsBetter: true },
        { label: 'Definición', a: o.definicion_efectividad_total_pct, b: n.definicion_efectividad_total_pct, unit: '%', higherIsBetter: true },
      ];
    }

    // physical
    const o = older.raw as PhysicalAssessment;
    const n = newer.raw as PhysicalAssessment;
    return [
      { label: 'Salto vertical',    a: o.salto_vertical_cm,   b: n.salto_vertical_cm,   unit: 'cm', higherIsBetter: true  },
      { label: 'Salto horizontal',  a: o.salto_horizontal_cm, b: n.salto_horizontal_cm, unit: 'cm', higherIsBetter: true  },
      { label: 'Sprint 20m',        a: o.sprint_20m,          b: n.sprint_20m,          unit: 's',  higherIsBetter: false },
    ];
  });

  comparisonHeaders = computed(() => {
    const a = this.compareA();
    const b = this.compareB();
    if (!a || !b) return { older: '', newer: '' };
    const rowA = this.allRows().find(r => r.id === a)!;
    const rowB = this.allRows().find(r => r.id === b)!;
    const [older, newer] = rowA.evaluation_date <= rowB.evaluation_date
      ? [rowA, rowB] : [rowB, rowA];
    return {
      older: this.formatDate(older.evaluation_date) + (older.period_label ? ` · ${older.period_label}` : ''),
      newer: this.formatDate(newer.evaluation_date) + (newer.period_label ? ` · ${newer.period_label}` : ''),
    };
  });

  athletes = computed(() => {
    const seen = new Set<string>();
    return this.allRows()
      .filter(r => { const ok = !seen.has(r.athlete_id); seen.add(r.athlete_id); return ok; })
      .map(r => ({ id: r.athlete_id, name: r.athlete_name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  ngOnInit() {
    const params    = this.route.snapshot.queryParamMap;
    const type      = params.get('type') as AssessmentType | null;
    const athleteId = params.get('athlete_id');
    if (type) this.filterType.set(type);
    if (athleteId) this.filterAthleteId.set(athleteId);

    forkJoin({
      nutritional: this.svc.getAllNutritional(),
      technical:   this.svc.getAllTechnical(),
      physical:    this.svc.getAllPhysical(),
    }).subscribe({
      next: ({ nutritional, technical, physical }) => {
        const rows: AssessmentRow[] = [
          ...nutritional.map(a => this.toRow(a, 'nutritional')),
          ...technical.map(a  => this.toRow(a, 'technical')),
          ...physical.map(a   => this.toRow(a, 'physical')),
        ].sort((a, b) => b.evaluation_date.localeCompare(a.evaluation_date));
        this.allRows.set(rows);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private toRow(
    a: NutritionalAssessment | TechnicalAssessment | PhysicalAssessment,
    type: AssessmentType
  ): AssessmentRow {
    const athleteName = a.athletes
      ? `${a.athletes.first_name} ${a.athletes.last_name}`
      : '—';

    let metric1 = '—';
    let metric2 = '—';

    if (type === 'nutritional') {
      const n = a as NutritionalAssessment;
      if (n.imc != null)              metric1 = `IMC ${n.imc}`;
      if (n.porcentaje_grasa != null) metric2 = `Grasa ${n.porcentaje_grasa}%`;
    } else if (type === 'technical') {
      const t = a as TechnicalAssessment;
      if (t.control_efectividad_total_pct != null) metric1 = `Control ${t.control_efectividad_total_pct}%`;
      if (t.pase_efectividad_pct != null)          metric2 = `Pase ${t.pase_efectividad_pct}%`;
    } else {
      const p = a as PhysicalAssessment;
      if (p.salto_vertical_cm != null) metric1 = `Salto ${p.salto_vertical_cm} cm`;
      if (p.sprint_20m != null)        metric2 = `Sprint ${p.sprint_20m}s`;
    }

    return {
      id: a.id, type, athlete_id: a.athlete_id, athlete_name: athleteName,
      evaluation_date: a.evaluation_date, period_label: a.period_label,
      metric1, metric2, raw: a,
    };
  }

  // ── Comparación ───────────────────────────────────────────────
  toggleCompare(row: AssessmentRow) {
    const a = this.compareA();
    const b = this.compareB();

    // Deseleccionar si ya está seleccionado
    if (a === row.id) { this.compareA.set(null); return; }
    if (b === row.id) { this.compareB.set(null); return; }

    // Asignar slots — solo permite mismo tipo
    if (!a) {
      this.compareA.set(row.id);
    } else {
      const rowA = this.allRows().find(r => r.id === a);
      if (rowA?.type !== row.type) {
        // Tipo diferente: reemplaza todo
        this.compareA.set(row.id);
        this.compareB.set(null);
      } else {
        this.compareB.set(row.id);
      }
    }
  }

  isSelectedForCompare(id: string): boolean {
    return this.compareA() === id || this.compareB() === id;
  }

  clearComparison() {
    this.compareA.set(null);
    this.compareB.set(null);
  }

  deltaArrow(f: CompareField): string {
    if (f.a == null || f.b == null) return '';
    const diff = f.b - f.a;
    if (Math.abs(diff) < 0.01) return '';
    const up = diff > 0;
    return up ? '↑' : '↓';
  }

  deltaClass(f: CompareField): string {
    if (f.a == null || f.b == null) return '';
    const diff = f.b - f.a;
    if (Math.abs(diff) < 0.01) return 'delta-neutral';
    const improved = f.higherIsBetter ? diff > 0 : diff < 0;
    return improved ? 'delta-up' : 'delta-down';
  }

  fmtVal(v: number | null, unit: string): string {
    if (v == null) return '—';
    return `${v}${unit ? ' ' + unit : ''}`;
  }

  // ── Filtros ───────────────────────────────────────────────────
  setFilter(type: AssessmentType | 'all') {
    this.filterType.set(type);
    this.clearComparison();
  }

  setSearch(value: string) { this.searchText.set(value); }

  onAthleteSelect(athleteId: string) {
    if (!athleteId) return;
    this.filterAthleteId.set(athleteId);
    this.searchText.set('');
    this.clearComparison();
    this.evoMode.set(false);
  }

  clearAthleteFilter() {
    this.filterAthleteId.set(null);
    this.clearComparison();
    this.evoMode.set(false);
  }

  enterEvoMode()  { this.evoMode.set(true);  this.clearComparison(); }
  exitEvoMode()   { this.evoMode.set(false); }

  // ── Navegación ────────────────────────────────────────────────
  goToDetail(row: AssessmentRow) {
    const typeSlug: Record<string, string> = { nutritional: 'nutricional', technical: 'tecnica', physical: 'fisica' };
    this.router.navigate(['/evaluaciones', typeSlug[row.type] ?? row.type, row.id]);
  }

  typeLabel(type: AssessmentType): string {
    return { nutritional: 'Nutricional', technical: 'Técnica', physical: 'Física' }[type];
  }

  formatDate(date: string): string {
    return new Date(date + 'T00:00:00').toLocaleDateString('es-CO', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }
}
