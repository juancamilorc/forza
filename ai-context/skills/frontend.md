# Frontend Skill — FORZA Angular 21

> Basado en el código real del proyecto. Leer antes de crear o modificar cualquier componente.

---

## Estructura de un módulo Angular

Cada feature tiene su carpeta dentro de `apps/web/src/app/features/`:

```
features/<modulo>/
├── <modulo>-list/
│   ├── <modulo>-list.ts
│   ├── <modulo>-list.html
│   └── <modulo>-list.scss
├── <modulo>-detail/          (si aplica)
│   └── ...
└── <modulo>-form/
    ├── <modulo>-form.ts
    ├── <modulo>-form.html
    └── <modulo>-form.scss
```

Los servicios HTTP van en `core/services/<recurso>.service.ts`.  
Las rutas se declaran en `app.routes.ts`.

---

## Componente — reglas absolutas

```typescript
@Component({
  selector: 'app-xxx-list',
  imports: [],           // standalone, NO NgModules
  templateUrl: './xxx-list.html',
  styleUrl: './xxx-list.scss',
})
export class XxxList implements OnInit {
  // inject() en lugar de constructor para todo
  private service = inject(XxxService);
  private auth    = inject(AuthService);
  private router  = inject(Router);
  private toast   = inject(ToastService);
}
```

- Todos los componentes son **standalone** (`imports: []`)
- **Nunca** constructor injection — siempre `inject()`
- Agregar al array `imports` del componente solo los módulos que use el template (ej: `FormsModule`, `RouterModule`)

---

## Signals — gestión de estado

```typescript
// Estado mutable
items    = signal<Item[]>([]);
loading  = signal(true);
search   = signal('');
saving   = signal(false);
error    = signal('');

// Estado derivado (computed)
filtered = computed(() => {
  const term = this.search();
  return this.items().filter(i =>
    i.name.toLowerCase().includes(term)
  );
});

// Leer un signal en el .ts
const valor = this.search();       // llamada como función

// Escribir
this.search.set('nuevo valor');
this.items.update(prev => [...prev, nuevoItem]);

// En el template: también se llama como función
// {{ loading() }}  |  @if (loading()) { ... }
```

---

## Servicios HTTP

```typescript
// core/services/xxx.service.ts
@Injectable({ providedIn: 'root' })
export class XxxService {
  private http = inject(HttpClient);
  private url  = `${environment.apiUrl}/xxx`;  // base URL del recurso

  getAll(athleteId?: string) {
    const params = athleteId ? `?athlete_id=${athleteId}` : '';
    return this.http.get<Xxx[]>(`${this.url}${params}`);
  }

  getOne(id: string) {
    return this.http.get<Xxx>(`${this.url}/${id}`);
  }

  create(data: Partial<Xxx>) {
    return this.http.post<Xxx>(this.url, data);
  }

  update(id: string, data: Partial<Xxx>) {
    return this.http.patch<Xxx>(`${this.url}/${id}`, data);
  }

  remove(id: string) {
    return this.http.delete(`${this.url}/${id}`);
  }
}
```

### Consumo en componentes

```typescript
ngOnInit() {
  this.service.getAll().subscribe({
    next: (data) => {
      this.items.set(data);
      this.loading.set(false);
    },
    error: () => this.loading.set(false),
  });
}
```

Para dos llamadas en paralelo usar `forkJoin`:
```typescript
import { forkJoin } from 'rxjs';

forkJoin({
  sessions: this.sessionsService.getAll(),
  meetings: this.scheduleService.getAll(),
}).subscribe({
  next: ({ sessions, meetings }) => { ... },
});
```

---

## Formularios — patrón estándar

```typescript
// Signal que contiene todos los campos del form
form = signal({
  nombre:    '',
  athlete_id: '',
  status:    'trial',
});

// Método genérico para actualizar cualquier campo
updateField(field: string, value: string) {
  this.form.update(f => ({ ...f, [field]: value }));
}

// Validación y submit
onSubmit() {
  const f = this.form();
  if (!f.nombre || !f.athlete_id) {
    this.error.set('Nombre y deportista son obligatorios');
    return;
  }

  this.saving.set(true);
  this.error.set('');

  const data = {
    nombre:     f.nombre,
    athlete_id: f.athlete_id,
    status:     f.status || null,
  };

  const id = this.route.snapshot.paramMap.get('id');
  const request = id ? this.service.update(id, data) : this.service.create(data);

  request.subscribe({
    next: (saved) => {
      this.toast.success(this.isEdit() ? 'Actualizado correctamente' : 'Creado correctamente');
      this.saving.set(false);
      setTimeout(() => this.router.navigate(['/ruta']), 500);
    },
    error: (err) => {
      const msg = err?.error?.message ?? err?.message ?? 'Error al guardar. Intenta de nuevo.';
      this.error.set(Array.isArray(msg) ? msg.join(', ') : msg);
      this.saving.set(false);
    },
  });
}
```

### Inputs en template — NO ngModel

```html
<!-- Input texto -->
<input type="text" [value]="form().nombre"
  (input)="updateField('nombre', $any($event.target).value)" />

<!-- Select — usar [selected] en cada option, NO [value] en el select -->
<select (change)="updateField('status', $any($event.target).value)">
  <option value="trial"    [selected]="form().status === 'trial'">Prueba</option>
  <option value="active"   [selected]="form().status === 'active'">Activo</option>
  <option value="inactive" [selected]="form().status === 'inactive'">Inactivo</option>
</select>

<!-- Textarea -->
<textarea [value]="form().notas"
  (input)="updateField('notas', $any($event.target).value)"></textarea>
```

> CRÍTICO: `[value]` en un `<select>` NO selecciona la opción correcta en Angular sin ngModel.
> Siempre usar `[selected]="form().campo === 'valor'"` en cada `<option>`.

---

## Control flow en templates

```html
@if (loading()) {
  <div class="loading">...</div>
}

@if (!loading() && items().length === 0) {
  <div class="empty-state">...</div>
}

@for (item of filtered(); track item.id) {
  <div>{{ item.nombre }}</div>
}

@empty {
  <p>Sin resultados</p>
}
```

---

## Rutas y navegación

### Convenciones en app.routes.ts

```typescript
// Rutas en español
{ path: 'deportistas', loadComponent: () => import('./...').then(m => m.AthletesList) },
{ path: 'deportistas/nuevo', loadComponent: ... },   // /nuevo ANTES que /:id
{ path: 'deportistas/:id/editar', loadComponent: ... },
{ path: 'deportistas/:id', loadComponent: ... },
```

Rutas activas: `deportistas`, `sesiones`, `planes`, `pagos`, `evaluaciones`, `agenda`, `videos`, `administracion`.

### Protección de rutas

```typescript
// En app.routes.ts
{
  path: 'pagos',
  canActivate: [rolesGuard('super_admin', 'admin')],
  loadComponent: () => import('./...').then(m => m.PaymentsList),
},
```

### Navegación programática (nunca routerLink en listas)

```typescript
goToDetail(id: string) {
  this.router.navigate(['/deportistas', id]);
}

goToEdit(id: string) {
  this.router.navigate(['/deportistas', id, 'editar']);
}

goToNew() {
  this.router.navigate(['/deportistas/nuevo']);
}

goBack() {
  this.location.back();  // inject(Location)
}
```

---

## Rol y permisos en componentes

```typescript
role    = this.auth.getRole() ?? '';
isAdmin = this.role === 'super_admin' || this.role === 'admin';

canCreate(): boolean {
  return ['super_admin', 'admin'].includes(this.role);
}
```

En template:
```html
@if (canCreate()) {
  <button (click)="goToNew()">Nuevo</button>
}
```

---

## localStorage / SSR

```typescript
// NUNCA acceder a localStorage directamente
// SIEMPRE usar isPlatformBrowser — ya está encapsulado en AuthService

// Si necesitas localStorage en otro servicio:
private platformId = inject(PLATFORM_ID);
private isBrowser  = isPlatformBrowser(this.platformId);

if (this.isBrowser) {
  localStorage.setItem('key', 'value');
}
```

---

## Toast notifications

```typescript
private toast = inject(ToastService);

this.toast.success('Guardado correctamente');
this.toast.error('Error al guardar');
```

---

## Auth interceptor (ya configurado globalmente)

El interceptor `authInterceptor` en `core/interceptors/auth.interceptor.ts`:
- Agrega `Authorization: Bearer <token>` a todos los requests HTTP
- Si el backend devuelve 401 → hace logout automático y redirige a `/login`
- No necesita configurarse por servicio, está en `app.config.ts`
