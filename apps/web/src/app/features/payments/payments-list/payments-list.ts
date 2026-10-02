import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { PaymentsService, Payment } from '../../../core/services/payments.service';
import { PLAN_TYPES } from '../../../core/services/plans.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-payments-list',
  imports: [],
  templateUrl: './payments-list.html',
  styleUrl: './payments-list.scss',
})
export class PaymentsList implements OnInit {
  private service = inject(PaymentsService);
  private auth    = inject(AuthService);
  private router  = inject(Router);
  private toast   = inject(ToastService);

  payments     = signal<Payment[]>([]);
  filtered     = signal<Payment[]>([]);
  loading      = signal(true);
  search       = signal('');
  statusFilter = signal('');
  planFilter   = signal('');
  monthFilter  = signal(''); // formato "YYYY-MM", filtra por due_date
  role         = this.auth.getRole() ?? '';

  readonly planTypes = PLAN_TYPES;

  // Modal abono
  abonoTarget  = signal<Payment | null>(null);
  abonoMonto   = signal('');
  abonoMethod  = signal('transferencia');
  abonoRef     = signal('');
  abonoSaving  = signal(false);

  ngOnInit() {
    this.service.getAll().subscribe({
      next: (data) => {
        this.payments.set(data);
        this.applyFilters();
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearch(event: Event) {
    this.search.set((event.target as HTMLInputElement).value.toLowerCase());
    this.applyFilters();
  }

  onStatusFilter(status: string) {
    this.statusFilter.set(status);
    this.applyFilters();
  }

  onPlanFilter(event: Event) {
    this.planFilter.set((event.target as HTMLSelectElement).value);
    this.applyFilters();
  }

  onMonthFilter(event: Event) {
    this.monthFilter.set((event.target as HTMLInputElement).value);
    this.applyFilters();
  }

  private normalize(str: string): string {
    return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  applyFilters() {
    let result = this.payments();
    const term   = this.normalize(this.search());
    const status = this.statusFilter();
    const plan   = this.planFilter();
    const month  = this.monthFilter(); // "YYYY-MM"

    if (term) {
      result = result.filter(p => {
        const name = this.normalize(`${p.athletes?.first_name} ${p.athletes?.last_name}`);
        return name.includes(term);
      });
    }
    if (status) result = result.filter(p => p.status === status);
    if (plan)   result = result.filter(p => p.plans?.plan_type === plan);
    if (month)  result = result.filter(p => p.due_date?.startsWith(month));
    this.filtered.set(result);
  }

  openAbono(payment: Payment) {
    this.abonoTarget.set(payment);
    this.abonoMonto.set('');
    this.abonoMethod.set('transferencia');
    this.abonoRef.set('');
  }

  closeAbono() {
    this.abonoTarget.set(null);
  }

  confirmarAbono() {
    const target = this.abonoTarget();
    const monto  = parseFloat(this.abonoMonto());
    if (!target || isNaN(monto) || monto <= 0) return;

    const saldo = target.amount - target.amount_paid;
    if (monto > saldo) {
      this.toast.error(`El abono no puede superar el saldo pendiente ($${saldo.toLocaleString('es-CO')})`);
      return;
    }

    this.abonoSaving.set(true);
    this.service.abonar(target.id, monto).subscribe({
      next: (updated) => {
        this.payments.update(list => list.map(p => p.id === updated.id ? { ...p, ...updated } : p));
        this.applyFilters();
        this.toast.success('Abono registrado correctamente');
        this.abonoSaving.set(false);
        this.closeAbono();
      },
      error: () => {
        this.toast.error('Error al registrar el abono');
        this.abonoSaving.set(false);
      },
    });
  }

  goToEdit(id: string) {
    this.router.navigate(['/pagos', id, 'editar']);
  }

  goToNew() {
    this.router.navigate(['/pagos/nuevo']);
  }

  isSuperAdmin() {
    return this.role === 'super_admin';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pendiente: 'Pendiente',
      parcial:   'Parcial',
      pagado:    'Pagado',
    };
    return labels[status] ?? status;
  }

  getMethodLabel(method: string | null): string {
    const labels: Record<string, string> = {
      transferencia: 'Transferencia',
      efectivo:      'Efectivo',
      otro:          'Otro',
    };
    return method ? (labels[method] ?? method) : '—';
  }

  getSaldo(p: Payment): number {
    return p.amount - p.amount_paid;
  }

  formatCOP(value: number): string {
    return value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
  }

  getPlanLabel(type: string | undefined): string {
    if (!type) return '—';
    return this.planTypes.find(p => p.value === type)?.label ?? type;
  }

  // Exporta exactamente lo que está filtrado en pantalla (FOR-67)
  exportarExcel() {
    const rows = this.filtered().map(p => ({
      Deportista: `${p.athletes?.first_name ?? ''} ${p.athletes?.last_name ?? ''}`.trim(),
      Plan: this.getPlanLabel(p.plans?.plan_type),
      Total: p.amount,
      Pagado: p.amount_paid,
      Saldo: this.getSaldo(p),
      Método: this.getMethodLabel(p.method),
      Vencimiento: p.due_date ?? '—',
      Estado: this.getStatusLabel(p.status),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pagos');

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `pagos_${fecha}.xlsx`);
  }
}
