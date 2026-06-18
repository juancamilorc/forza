import { Component, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser , Location } from '@angular/common';
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
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private location = inject(Location);
  private svc        = inject(AssessmentsService);
  private platformId = inject(PLATFORM_ID);

  assessment = signal<TechnicalAssessmentFull | null>(null);
  loading    = signal(true);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.svc.getTechnicalById(id).subscribe({
      next:  (d) => { this.assessment.set(d); this.loading.set(false); },
      error: ()  => { this.loading.set(false); this.router.navigate(['/evaluaciones']); },
    });
  }

  goBack() { this.location.back(); }
  printPage()  { if (isPlatformBrowser(this.platformId)) window.print(); }
  goToAthlete() {
    const id = this.assessment()?.athlete_id;
    if (id) this.router.navigate(['/deportistas', id]);
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
