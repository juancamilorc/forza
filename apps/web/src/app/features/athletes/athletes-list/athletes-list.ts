import { Component, computed, inject, OnInit, signal } from '@angular/core';
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

  athletes     = signal<Athlete[]>([]);
  loading      = signal(true);
  search       = signal('');
  statusFilter = signal('');

  filtered = computed(() => {
    const term   = this.search();
    const status = this.statusFilter();
    return this.athletes().filter(a => {
      const matchesSearch = !term || this.normalize(`${a.first_name} ${a.last_name}`).includes(term);
      const matchesStatus = !status || a.status === status;
      return matchesSearch && matchesStatus;
    });
  });

  role = this.auth.getRole() ?? '';

  ngOnInit() {
    this.athletesService.getAll().subscribe({
      next: (data) => { this.athletes.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  private normalize(str: string): string {
    return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  onSearch(event: Event) {
    this.search.set(this.normalize((event.target as HTMLInputElement).value));
  }

  onStatusFilter(status: string) {
    this.statusFilter.set(status);
  }

  goToDetail(id: string) {
    this.router.navigate(['/deportistas', id]);
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

  goToNew() {
    this.router.navigate(['/deportistas/nuevo']);
  }
}
