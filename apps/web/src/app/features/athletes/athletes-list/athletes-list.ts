import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AthletesService, Athlete } from '../../../core/services/athletes.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-athletes-list',
  imports: [],
  templateUrl: './athletes-list.html',
  styleUrl: './athletes-list.scss',
})
export class AthletesList implements OnInit {
  private athletesService = inject(AthletesService);
  private auth            = inject(AuthService);
  private router          = inject(Router);

  athletes  = signal<Athlete[]>([]);
  filtered  = signal<Athlete[]>([]);
  loading   = signal(true);
  search    = signal('');
  role      = this.auth.getRole() ?? '';

  ngOnInit() {
    this.athletesService.getAll().subscribe({
      next: (data) => {
        this.athletes.set(data);
        this.filtered.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearch(event: Event) {
    const term = (event.target as HTMLInputElement).value.toLowerCase();
    this.search.set(term);
    this.filtered.set(
      this.athletes().filter(a =>
        `${a.first_name} ${a.last_name}`.toLowerCase().includes(term)
      )
    );
  }

  goToDetail(id: string) {
    this.router.navigate(['/athletes', id]);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      active:   'Activo',
      inactive: 'Inactivo',
      trial:    'Prueba',
    };
    return labels[status] ?? status;
  }

  canCreate(): boolean {
    return ['super_admin', 'admin'].includes(this.role);
  }
}
