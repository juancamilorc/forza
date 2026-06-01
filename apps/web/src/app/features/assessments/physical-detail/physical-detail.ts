import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AssessmentsService, PhysicalAssessmentFull } from '../../../core/services/assessments.service';

const MOVIL_LABELS: Record<string, string> = {
  '0': 'No logra',
  '1': 'Compensaciones importantes',
  '2': 'Compensaciones menores',
  '3': 'Perfecto',
};

@Component({
  selector: 'app-physical-detail',
  imports: [DatePipe],
  templateUrl: './physical-detail.html',
  styleUrl: './physical-detail.scss',
})
export class PhysicalDetail implements OnInit {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private svc    = inject(AssessmentsService);

  assessment = signal<PhysicalAssessmentFull | null>(null);
  loading    = signal(true);

  movilZones = [
    { field: 'movilidad_pies',    analisis: 'movilidad_pies_analisis',    label: 'Pies' },
    { field: 'movilidad_rodillas', analisis: 'movilidad_rodillas_analisis', label: 'Rodillas' },
    { field: 'movilidad_talones', analisis: 'movilidad_talones_analisis',  label: 'Talones' },
    { field: 'movilidad_cadera',  analisis: 'movilidad_cadera_analisis',   label: 'Cadera' },
    { field: 'movilidad_tronco',  analisis: 'movilidad_tronco_analisis',   label: 'Tronco' },
    { field: 'movilidad_brazos',  analisis: 'movilidad_brazos_analisis',   label: 'Brazos' },
  ] as const;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.svc.getPhysicalById(id).subscribe({
      next:  (d) => { this.assessment.set(d); this.loading.set(false); },
      error: ()  => { this.loading.set(false); this.router.navigate(['/evaluaciones']); },
    });
  }

  goBack()     { this.router.navigate(['/evaluaciones']); }
  goToAthlete() {
    const id = this.assessment()?.athlete_id;
    if (id) this.router.navigate(['/deportistas', id]);
  }

  getValue(field: string): number | null {
    return (this.assessment() as any)?.[field] ?? null;
  }

  getAnalisis(field: string): string | null {
    return (this.assessment() as any)?.[field] ?? null;
  }

  movilLabel(v: number | null): string {
    if (v == null) return '—';
    return MOVIL_LABELS[String(v)] ?? String(v);
  }

  classCss(c: string | null): string   { return c ? `semaforo-${c}` : ''; }
  classLabel(c: string | null): string { return c ? this.svc.getPhysicalClassLabel(c) : '—'; }

  fmt(v: number | null | undefined, decimals = 2): string {
    if (v == null) return '—';
    return v.toFixed(decimals);
  }
}
