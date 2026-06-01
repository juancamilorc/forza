import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { map } from 'rxjs';
import { PlansService, Plan } from '../../../core/services/plans.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

type StatusFilter = 'all' | 'active' | 'frozen' | 'cancelled';

@Component({
  selector: 'app-plans-list',
  imports: [],
  templateUrl: './plans-list.html',
  styleUrl: './plans-list.scss',
})
export class PlansList implements OnInit {
  private svc    = inject(PlansService);
  private auth   = inject(AuthService);
  private router = inject(Router);
  private toast  = inject(ToastService);

  role    = this.auth.getRole() ?? '';
  loading = signal(true);

  private allPlans = signal<Plan[]>([]);
  statusFilter     = signal<StatusFilter>('all');
  searchText       = signal('');

  // Freeze modal
  freezeTarget = signal<Plan | null>(null);
  freezeReason = signal('');
  freezeSaving = signal(false);

  // Confirm modal (unfreeze / cancel / delete)
  confirmTarget  = signal<Plan | null>(null);
  confirmAction  = signal<'unfreeze' | 'cancel' | 'delete' | null>(null);
  confirmSaving  = signal(false);

  filteredPlans = computed(() => {
    let plans = this.allPlans();
    const status = this.statusFilter();
    if (status !== 'all') {
      plans = plans.filter(p => this.svc.getPlanStatus(p) === status);
    }
    const q = this.normalize(this.searchText());
    if (q) {
      plans = plans.filter(p => {
        const name = this.normalize(`${p.athletes?.first_name} ${p.athletes?.last_name}`);
        return name.includes(q);
      });
    }
    return plans;
  });

  counts = computed(() => ({
    all:       this.allPlans().length,
    active:    this.allPlans().filter(p => this.svc.getPlanStatus(p) === 'active').length,
    frozen:    this.allPlans().filter(p => this.svc.getPlanStatus(p) === 'frozen').length,
    cancelled: this.allPlans().filter(p => this.svc.getPlanStatus(p) === 'cancelled').length,
  }));

  ngOnInit() {
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next:  (data) => { this.allPlans.set(data); this.loading.set(false); },
      error: ()     => this.loading.set(false),
    });
  }

  private normalize(str: string): string {
    return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  setFilter(status: StatusFilter) { this.statusFilter.set(status); }
  setSearch(value: string)        { this.searchText.set(value); }

  // ── Freeze ────────────────────────────────────────────────────
  openFreeze(plan: Plan, event: Event) {
    event.stopPropagation();
    this.freezeTarget.set(plan);
    this.freezeReason.set('');
  }

  closeFreeze() { this.freezeTarget.set(null); }

  confirmFreeze() {
    const plan   = this.freezeTarget();
    const reason = this.freezeReason().trim();
    if (!plan) return;
    this.freezeSaving.set(true);
    this.svc.freeze(plan.id, reason).subscribe({
      next: (updated) => {
        this.allPlans.update(list => list.map(p => p.id === updated.id ? { ...p, ...updated } : p));
        this.toast.success('Plan congelado');
        this.freezeSaving.set(false);
        this.closeFreeze();
      },
      error: () => { this.toast.error('Error al congelar el plan'); this.freezeSaving.set(false); },
    });
  }

  // ── Unfreeze / Cancel / Delete ────────────────────────────────
  openConfirm(plan: Plan, action: 'unfreeze' | 'cancel' | 'delete', event: Event) {
    event.stopPropagation();
    this.confirmTarget.set(plan);
    this.confirmAction.set(action);
  }

  closeConfirm() { this.confirmTarget.set(null); this.confirmAction.set(null); }

  runConfirm() {
    const plan   = this.confirmTarget();
    const action = this.confirmAction();
    if (!plan || !action) return;
    this.confirmSaving.set(true);

    const req$ = action === 'unfreeze'
      ? this.svc.unfreeze(plan.id).pipe(map(() => null))
      : action === 'cancel'
      ? this.svc.cancelPlan(plan.id).pipe(map(() => null))
      : this.svc.delete(plan.id).pipe(map(() => null));

    req$.subscribe({
      next: () => {
        if (action === 'delete') {
          this.allPlans.update(list => list.filter(p => p.id !== plan.id));
          this.toast.success('Plan eliminado');
        } else if (action === 'unfreeze') {
          this.allPlans.update(list => list.map(p =>
            p.id === plan.id ? { ...p, is_frozen: false, frozen_at: null, frozen_reason: null } : p
          ));
          this.toast.success('Plan descongelado');
        } else {
          this.allPlans.update(list => list.map(p =>
            p.id === plan.id ? { ...p, is_active: false } : p
          ));
          this.toast.success('Plan cancelado');
        }
        this.confirmSaving.set(false);
        this.closeConfirm();
      },
      error: (err) => {
        const msg = err?.error?.message ?? '';
        const isFK = typeof msg === 'string'
          ? msg.includes('foreign key')
          : Array.isArray(msg) && msg.some((m: string) => m.includes('foreign key'));
        this.toast.error(
          isFK
            ? 'No se puede eliminar: el plan tiene pagos o sesiones asociadas'
            : 'Error al ejecutar la acción'
        );
        this.confirmSaving.set(false);
      },
    });
  }

  // ── Nav ───────────────────────────────────────────────────────
  goToNew()          { this.router.navigate(['/planes/nuevo']); }
  goToEdit(plan: Plan, event: Event) {
    event.stopPropagation();
    this.router.navigate(['/planes', plan.id, 'editar']);
  }
  goToAthlete(plan: Plan, event: Event) {
    event.stopPropagation();
    this.router.navigate(['/deportistas', plan.athlete_id]);
  }

  // ── Helpers ───────────────────────────────────────────────────
  canManage(): boolean { return ['super_admin', 'admin'].includes(this.role); }
  isSuperAdmin(): boolean { return this.role === 'super_admin'; }

  athleteName(plan: Plan): string {
    return plan.athletes
      ? `${plan.athletes.first_name} ${plan.athletes.last_name}`
      : '—';
  }

  statusLabel(plan: Plan): string {
    const s = this.svc.getPlanStatus(plan);
    return s === 'active' ? 'Activo' : s === 'frozen' ? 'Congelado' : 'Cancelado';
  }

  statusCss(plan: Plan): string {
    return `status-${this.svc.getPlanStatus(plan)}`;
  }

  planLabel(type: string): string { return this.svc.getPlanLabel(type); }

  formatDate(d: string): string {
    return new Date(d + 'T00:00:00').toLocaleDateString('es-CO', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  confirmTitle(): string {
    const a = this.confirmAction();
    return a === 'unfreeze' ? 'Descongelar plan'
         : a === 'cancel'   ? 'Cancelar plan'
         :                    'Eliminar plan';
  }

  confirmMessage(): string {
    const a    = this.confirmAction();
    const name = this.athleteName(this.confirmTarget()!);
    return a === 'unfreeze' ? `¿Descongelar el plan de ${name}?`
         : a === 'cancel'   ? `¿Cancelar el plan de ${name}? Esta acción marcará el plan como inactivo.`
         :                    `¿Eliminar el plan de ${name}? Esta acción no se puede deshacer.`;
  }

  confirmBtnLabel(): string {
    const a = this.confirmAction();
    return a === 'unfreeze' ? 'Descongelar'
         : a === 'cancel'   ? 'Cancelar plan'
         :                    'Eliminar';
  }

  confirmBtnClass(): string {
    return this.confirmAction() === 'delete' ? 'btn-danger' : 'btn-warning';
  }
}
