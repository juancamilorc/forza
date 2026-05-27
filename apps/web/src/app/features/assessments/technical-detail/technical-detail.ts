import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AssessmentsService, TechnicalAssessmentFull } from '../../../core/services/assessments.service';

@Component({
  selector: 'app-technical-detail',
  imports: [DatePipe],
  templateUrl: './technical-detail.html',
  styleUrl: './technical-detail.scss',
})
export class TechnicalDetail implements OnInit {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private svc    = inject(AssessmentsService);

  assessment = signal<TechnicalAssessmentFull | null>(null);
  loading    = signal(true);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.svc.getTechnicalById(id).subscribe({
      next:  (d) => { this.assessment.set(d); this.loading.set(false); },
      error: ()  => { this.loading.set(false); this.router.navigate(['/assessments']); },
    });
  }

  goBack()     { this.router.navigate(['/assessments']); }
  goToAthlete() {
    const id = this.assessment()?.athlete_id;
    if (id) this.router.navigate(['/athletes', id]);
  }

  classCss(c: string | null): string   { return c ? `semaforo-${c}` : ''; }
  classLabel(c: string | null): string { return c ? this.svc.getTechnicalClassLabel(c) : '—'; }

  pct(value: number | null): string {
    return value != null ? `${value}%` : '—';
  }

  fmt(v: number | null | undefined, decimals = 2): string {
    if (v == null) return '—';
    return v.toFixed(decimals);
  }
}
