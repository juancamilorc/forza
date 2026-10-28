// Réplica de la regla del backend (TrainerAvailabilityService) para avisar al
// usuario antes de guardar. El backend sigue siendo quien rechaza.

export interface TrainerAvailability {
  available_days?:         string[] | null;
  available_hours_start?:  string | null;
  available_hours_end?:    string | null;
  users?:                  { full_name: string };
}

export const WEEK_DAYS: { key: string; short: string; label: string }[] = [
  { key: 'lunes',     short: 'L',  label: 'lunes' },
  { key: 'martes',    short: 'M',  label: 'martes' },
  { key: 'miercoles', short: 'Mi', label: 'miércoles' },
  { key: 'jueves',    short: 'J',  label: 'jueves' },
  { key: 'viernes',   short: 'V',  label: 'viernes' },
  { key: 'sabado',    short: 'S',  label: 'sábado' },
  { key: 'domingo',   short: 'D',  label: 'domingo' },
];

const DAY_KEYS_BY_JS_DAY = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const hhmm   = (t: string) => t.slice(0, 5);
const plural = (label: string) => (label.endsWith('s') ? label : `${label}s`);
const labelOf = (key: string) => WEEK_DAYS.find(d => d.key === key)?.label ?? key;

export function availabilityWarning(
  trainer: TrainerAvailability | undefined | null,
  date: string,
  time: string,
): string | null {
  if (!trainer || !date) return null;

  const name = trainer.users?.full_name ?? 'El entrenador';
  const dayKey = DAY_KEYS_BY_JS_DAY[new Date(`${date.slice(0, 10)}T00:00:00Z`).getUTCDay()];
  const days = trainer.available_days;

  if (days && days.length > 0 && !days.includes(dayKey)) {
    return `${name} no está disponible los ${plural(labelOf(dayKey))}. Días disponibles: ${days.map(labelOf).join(', ')}`;
  }

  if (!time) return null;
  const start = trainer.available_hours_start ? hhmm(trainer.available_hours_start) : null;
  const end   = trainer.available_hours_end   ? hhmm(trainer.available_hours_end)   : null;
  const t     = hhmm(time);

  if ((start && t < start) || (end && t > end)) {
    const rango = start && end ? `de ${start} a ${end}` : start ? `desde las ${start}` : `hasta las ${end}`;
    return `${name} solo está disponible ${rango}`;
  }
  return null;
}
