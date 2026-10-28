import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import {
  TrialSessionsService, TrialSession, TrialSessionInput, ConvertTrialInput,
} from '../../../core/services/trial-sessions.service';
import { TrainersService, Trainer } from '../../../core/services/trainers.service';
import { ToastService } from '../../../core/services/toast.service';

type Filter = 'programada' | 'cancelada' | 'all';

interface TrialForm {
  child_name:        string;
  guardian_name:     string;
  guardian_whatsapp: string;
  guardian_email:    string;
  trial_date:        string;
  trial_time:        string;
  location:          string;
  trainer_id:        string;
  notes:             string;
}

const EMPTY_FORM: TrialForm = {
  child_name: '', guardian_name: '', guardian_whatsapp: '', guardian_email: '',
  trial_date: '', trial_time: '', location: '', trainer_id: '', notes: '',
};

const EMPTY_CONVERT: ConvertTrialInput = {
  first_name: '', last_name: '', birth_date: '', gender: '',
};

@Component({
  selector: 'app-trial-sessions-list',
  imports: [DatePipe, CurrencyPipe],
  templateUrl: './trial-sessions-list.html',
  styleUrl: './trial-sessions-list.scss',
})
export class TrialSessionsList implements OnInit {
  private service  = inject(TrialSessionsService);
  private trainers = inject(TrainersService);
  private toast    = inject(ToastService);
  private router   = inject(Router);

  loading     = signal(true);
  items       = signal<TrialSession[]>([]);
  price       = signal(35000);
  filter      = signal<Filter>('programada');
  trainerList = signal<Trainer[]>([]);

  // Modal crear / editar (reprogramar)
  formOpen  = signal(false);
  editingId = signal<string | null>(null);
  form      = signal<TrialForm>({ ...EMPTY_FORM });
  saving    = signal(false);

  // Modal convertir a deportista
  convertTarget = signal<TrialSession | null>(null);
  convertForm   = signal<ConvertTrialInput>({ ...EMPTY_CONVERT });
  converting    = signal(false);

  visible = computed(() => {
    const f = this.filter();
    return this.items().filter(t => f === 'all' || t.status === f);
  });

  // Agenda: tarjetas agrupadas por día, en orden cronológico
  groups = computed(() => {
    const byDate = new Map<string, TrialSession[]>();
    for (const t of this.visible()) {
      const list = byDate.get(t.trial_date) ?? [];
      list.push(t);
      byDate.set(t.trial_date, list);
    }
    return [...byDate.entries()].map(([date, sessions]) => ({ date, sessions }));
  });

  ngOnInit() {
    this.trainers.getAll().subscribe({ next: (t) => this.trainerList.set(t) });
    this.load();
  }

  load() {
    this.service.getAll().subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.price.set(res.price);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.show('No se pudieron cargar las clases de prueba', 'error');
      },
    });
  }

  setFilter(f: Filter) { this.filter.set(f); }

  hora(t: TrialSession): string { return t.trial_time.slice(0, 5); }

  isLocked(t: TrialSession): boolean {
    return t.status === 'cancelada' || !!t.converted_to_athlete_id;
  }

  private errorMessage(err: any, fallback: string): string {
    const msg = err?.error?.message ?? err?.message ?? fallback;
    return Array.isArray(msg) ? msg.join(', ') : msg;
  }

  // ── Crear / editar ──────────────────────────────────────────
  openCreate() {
    this.editingId.set(null);
    this.form.set({ ...EMPTY_FORM });
    this.formOpen.set(true);
  }

  openEdit(t: TrialSession) {
    this.editingId.set(t.id);
    this.form.set({
      child_name:        t.child_name,
      guardian_name:     t.guardian_name,
      guardian_whatsapp: t.guardian_whatsapp,
      guardian_email:    t.guardian_email ?? '',
      trial_date:        t.trial_date,
      trial_time:        this.hora(t),
      location:          t.location ?? '',
      trainer_id:        t.trainer_id ?? '',
      notes:             t.notes ?? '',
    });
    this.formOpen.set(true);
  }

  closeForm() { this.formOpen.set(false); }

  updateField(field: keyof TrialForm, value: string) {
    this.form.update(f => ({ ...f, [field]: value }));
  }

  save() {
    const f = this.form();
    if (!f.child_name || !f.guardian_name || !f.guardian_whatsapp
        || !f.trial_date || !f.trial_time || !f.trainer_id) {
      this.toast.show('Deportista, acudiente, WhatsApp, fecha, hora y entrenador son obligatorios', 'error');
      return;
    }

    const payload: TrialSessionInput = {
      child_name:        f.child_name,
      guardian_name:     f.guardian_name,
      guardian_whatsapp: f.guardian_whatsapp,
      trial_date:        f.trial_date,
      trial_time:        f.trial_time,
      trainer_id:        f.trainer_id,
      ...(f.guardian_email && { guardian_email: f.guardian_email }),
      ...(f.location       && { location: f.location }),
      ...(f.notes          && { notes: f.notes }),
    };

    const id = this.editingId();
    const request = id ? this.service.update(id, payload) : this.service.create(payload);

    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.toast.success(id ? 'Clase de prueba actualizada' : 'Clase de prueba registrada');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.show(this.errorMessage(err, 'Error al guardar la clase de prueba'), 'error');
      },
    });
  }

  // ── Acciones por tarjeta ────────────────────────────────────
  cancel(t: TrialSession) {
    if (!confirm(`¿Cancelar la clase de prueba de ${t.child_name}?`)) return;
    this.service.cancel(t.id).subscribe({
      next: () => { this.toast.success('Clase de prueba cancelada'); this.load(); },
      error: (err) => this.toast.show(this.errorMessage(err, 'No se pudo cancelar'), 'error'),
    });
  }

  markPaid(t: TrialSession) {
    this.service.markPaid(t.id).subscribe({
      next: () => { this.toast.success('Pago registrado'); this.load(); },
      error: (err) => this.toast.show(this.errorMessage(err, 'No se pudo registrar el pago'), 'error'),
    });
  }

  openWhatsapp(t: TrialSession) {
    this.service.whatsappLink(t.id).subscribe({
      next: (res) => window.open(res.url, '_blank', 'noopener'),
      error: (err) => this.toast.show(this.errorMessage(err, 'No se pudo generar el link'), 'error'),
    });
  }

  copyMessage(t: TrialSession) {
    this.service.whatsappLink(t.id).subscribe({
      next: async (res) => {
        try {
          await navigator.clipboard.writeText(res.message);
          this.toast.success('Mensaje copiado. Pégalo en el chat de WhatsApp.');
        } catch {
          this.toast.show('No se pudo copiar. Usa el botón WhatsApp.', 'error');
        }
      },
      error: (err) => this.toast.show(this.errorMessage(err, 'No se pudo generar el mensaje'), 'error'),
    });
  }

  // ── Convertir a deportista ──────────────────────────────────
  openConvert(t: TrialSession) {
    const [first, ...rest] = t.child_name.trim().split(/\s+/);
    this.convertForm.set({ first_name: first ?? '', last_name: rest.join(' '), birth_date: '', gender: '' });
    this.convertTarget.set(t);
  }

  closeConvert() { this.convertTarget.set(null); }

  updateConvertField(field: keyof ConvertTrialInput, value: string) {
    this.convertForm.update(f => ({ ...f, [field]: value }));
  }

  convert() {
    const t = this.convertTarget();
    const f = this.convertForm();
    if (!t) return;
    if (!f.first_name || !f.last_name || !f.birth_date || !f.gender) {
      this.toast.show('Nombre, apellido, fecha de nacimiento y género son obligatorios', 'error');
      return;
    }

    this.converting.set(true);
    this.service.convert(t.id, f).subscribe({
      next: (athlete) => {
        this.converting.set(false);
        this.convertTarget.set(null);
        this.toast.success('Deportista creado. Ahora asígnale un plan.');
        this.router.navigate(['/deportistas', athlete.id]);
      },
      error: (err) => {
        this.converting.set(false);
        this.toast.show(this.errorMessage(err, 'No se pudo convertir en deportista'), 'error');
      },
    });
  }
}
