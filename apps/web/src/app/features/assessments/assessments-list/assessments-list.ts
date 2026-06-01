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
  id:             string;
  type:           AssessmentType;
  athlete_id:     string;
  athlete_name:   string;
  evaluation_date: string;
  period_label:   string | null;
  metric1:        string;
  metric2:        string;
}

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

  loading          = signal(true);
  filterType       = signal<AssessmentType | 'all'>('all');
  filterAthleteId  = signal<string | null>(null);
  searchText       = signal('');

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
    if (athleteId) {
      rows = rows.filter(r => r.athlete_id === athleteId);
    }
    const q = this.searchText().toLowerCase().trim();
    if (q) {
      rows = rows.filter(r => r.athlete_name.toLowerCase().includes(q));
    }
    return rows;
  });

  // Unique athletes for reference
  athletes = computed(() => {
    const seen = new Set<string>();
    return this.allRows()
      .filter(r => { const ok = !seen.has(r.athlete_id); seen.add(r.athlete_id); return ok; })
      .map(r => ({ id: r.athlete_id, name: r.athlete_name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    const type = params.get('type') as AssessmentType | null;
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

  private toRow(a: NutritionalAssessment | TechnicalAssessment | PhysicalAssessment, type: AssessmentType): AssessmentRow {
    const athleteName = a.athletes
      ? `${a.athletes.first_name} ${a.athletes.last_name}`
      : '—';

    let metric1 = '—';
    let metric2 = '—';

    if (type === 'nutritional') {
      const n = a as NutritionalAssessment;
      if (n.imc != null)           metric1 = `IMC ${n.imc}`;
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

    return { id: a.id, type, athlete_id: a.athlete_id, athlete_name: athleteName, evaluation_date: a.evaluation_date, period_label: a.period_label, metric1, metric2 };
  }

  setFilter(type: AssessmentType | 'all') { this.filterType.set(type); }
  setSearch(value: string) { this.searchText.set(value); }
  clearAthleteFilter() { this.filterAthleteId.set(null); }

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
