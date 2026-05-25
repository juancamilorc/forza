import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Appointment {
  id:               string;
  trainer_id:       string;
  athlete_id:       string | null;
  type:             'trial' | 'regular';
  status:           'scheduled' | 'completed' | 'cancelled' | 'no_show';
  scheduled_date:   string;
  scheduled_time:   string;
  location:         string | null;
  notes:            string | null;
  reschedule_count: number;
  created_at:       string;
  athletes?:        { id: string; first_name: string; last_name: string } | null;
  trainers?:        { id: string; users: { full_name: string } } | null;
}

export interface TrainerOption {
  id:    string;
  users: { full_name: string };
}

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/schedule`;

  getAll(trainerId?: string, date?: string) {
    const params = new URLSearchParams();
    if (trainerId) params.set('trainer_id', trainerId);
    if (date)      params.set('date', date);
    const qs = params.toString();
    return this.http.get<Appointment[]>(`${this.base}${qs ? '?' + qs : ''}`);
  }

  getOne(id: string) {
    return this.http.get<Appointment>(`${this.base}/${id}`);
  }

  create(data: Partial<Appointment>) {
    return this.http.post<Appointment>(this.base, data);
  }

  update(id: string, data: Partial<Appointment>) {
    return this.http.patch<Appointment>(`${this.base}/${id}`, data);
  }

  reschedule(id: string, scheduledDate: string, scheduledTime: string) {
    return this.http.patch<Appointment>(`${this.base}/${id}/reschedule`, {
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
    });
  }

  cancel(id: string) {
    return this.http.patch<Appointment>(`${this.base}/${id}/cancel`, {});
  }

  delete(id: string) {
    return this.http.delete(`${this.base}/${id}`);
  }

  getTrainers() {
    return this.http.get<TrainerOption[]>(`${environment.apiUrl}/admin/trainers`);
  }

  buildCalendarLink(a: Appointment): string {
    const athlete  = a.athletes ? `${a.athletes.first_name} ${a.athletes.last_name}` : 'Sin deportista';
    const trainer  = a.trainers?.users?.full_name ?? '';
    const tipo     = a.type === 'trial' ? 'Prueba' : 'Regular';
    const title    = `Clase FORZA | ${tipo} | ${athlete}`;

    const lines: string[] = [];
    if (trainer)  lines.push(`Entrenador: ${trainer}`);
    if (a.location) lines.push(`Lugar: ${a.location}`);
    if (a.notes)  lines.push('', a.notes);
    const details = lines.join('\n');

    const d        = a.scheduled_date.replace(/-/g, '');
    const [hh, mm] = a.scheduled_time.split(':');
    const endHour  = String(parseInt(hh, 10) + 1).padStart(2, '0');
    const start    = `${d}T${hh}${mm}00`;
    const end      = `${d}T${endHour}${mm}00`;
    const params   = new URLSearchParams({
      action:   'TEMPLATE',
      text:     title,
      dates:    `${start}/${end}`,
      location: a.location ?? '',
      details,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }
}
