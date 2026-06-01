import { Component, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AssessmentsService, NutritionalAssessmentFull } from '../../../core/services/assessments.service';

@Component({
  selector: 'app-nutritional-detail',
  imports: [DatePipe],
  templateUrl: './nutritional-detail.html',
  styleUrl: './nutritional-detail.scss',
})
export class NutritionalDetail implements OnInit {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private svc        = inject(AssessmentsService);
  private platformId = inject(PLATFORM_ID);

  assessment = signal<NutritionalAssessmentFull | null>(null);
  loading    = signal(true);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.svc.getNutritionalById(id).subscribe({
      next:  (d) => { this.assessment.set(d); this.loading.set(false); },
      error: ()  => { this.loading.set(false); this.router.navigate(['/evaluaciones']); },
    });
  }

  goBack()     { this.router.navigate(['/evaluaciones']); }
  printPage()  { if (isPlatformBrowser(this.platformId)) window.print(); }

  goToAthlete() {
    const id = this.assessment()?.athlete_id;
    if (id) this.router.navigate(['/deportistas', id]);
  }

  classLabel(c: string | null): string {
    if (!c) return '—';
    return this.svc.getNutritionalClassLabel(c);
  }

  classCss(c: string | null): string {
    if (!c) return '';
    return `semaforo-${c}`;
  }

  fmt(v: number | null | undefined, decimals = 2): string {
    if (v == null) return '—';
    return v.toFixed(decimals);
  }

  hasPlan(): boolean {
    const a = this.assessment();
    if (!a) return false;
    return !!(a.plan_desayuno || a.plan_media_manana || a.plan_almuerzo ||
              a.plan_media_tarde || a.plan_cena || a.plan_finde);
  }

  hasPliegues(): boolean {
    const a = this.assessment();
    if (!a) return false;
    return !!(a.pliegue_tricipital_mm || a.pliegue_subescapular_mm || a.pliegue_supraespinal_mm);
  }
}
