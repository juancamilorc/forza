# Backend Skill — FORZA NestJS

> Basado en el código real del proyecto. Leer antes de crear o modificar cualquier módulo backend.

---

## Estructura de un módulo NestJS

Cada módulo tiene exactamente tres archivos:

```
apps/api/src/<nombre>/
├── <nombre>.module.ts
├── <nombre>.service.ts
└── <nombre>.controller.ts
```

### module.ts — patrón estándar

```typescript
import { Module } from '@nestjs/common';
import { XxxService } from './xxx.service';
import { XxxController } from './xxx.controller';

@Module({
  controllers: [XxxController],
  providers:   [XxxService],
  exports:     [XxxService],   // solo si otro módulo lo necesita
})
export class XxxModule {}
```

Registrar en `app/app.module.ts` dentro del array `imports`.  
`SupabaseModule` ya está registrado globalmente — no necesita importarse en cada módulo.

---

## SupabaseService

```typescript
// Inyección en el servicio
constructor(private supabase: SupabaseService) {}

// Acceso al cliente
this.supabase.db  // SupabaseClient con SERVICE_ROLE_KEY
```

### Patrones de query

```typescript
// findAll con relaciones
const { data, error } = await this.supabase.db
  .from('athletes')
  .select('*, trainers(id, users(full_name, email)), guardians(*)')
  .order('created_at', { ascending: false });

if (error) throw new BadRequestException(error.message);

// findOne
const { data, error } = await this.supabase.db
  .from('athletes')
  .select('*, plans(*)')
  .eq('id', id)
  .single();

if (error || !data) throw new NotFoundException(`Deportista ${id} no encontrado`);

// insert — SIEMPRE con .select().single() para obtener el registro creado
const { data, error } = await this.supabase.db
  .from('athletes')
  .insert({ ...dto })
  .select()
  .single();

// update — SIEMPRE llamar findOne() primero para validar que existe
await this.findOne(id);
const { data, error } = await this.supabase.db
  .from('athletes')
  .update({ ...dto })
  .eq('id', id)
  .select()
  .single();

// delete
const { error } = await this.supabase.db
  .from('athletes')
  .delete()
  .eq('id', id);

// filtro condicional
let query = this.supabase.db.from('athletes').select('*');
if (trainerId) query = query.eq('trainer_id', trainerId);
const { data, error } = await query;
```

---

## DTOs y validaciones

### Ubicación
`libs/shared/src/lib/dtos/<recurso>/`  
Importar siempre desde `@forza/shared`.

### CreateDto — patrón
```typescript
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsEnum, IsDateString, IsInt, Min } from 'class-validator';

export class CreateXxxDto {
  @IsUUID()
  @IsNotEmpty()
  athlete_id!: string;           // FK requerida

  @IsEnum(SomeEnum)
  @IsNotEmpty()
  tipo!: SomeEnum;               // enum requerido

  @IsDateString()
  @IsNotEmpty()
  fecha!: string;

  @IsString()
  @IsOptional()
  notas?: string;                // opcional: siempre con ?
}
```

### UpdateDto — SIEMPRE así
```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateXxxDto } from './create-xxx.dto';

export class UpdateXxxDto extends PartialType(CreateXxxDto) {}
```

### Reglas
- Campos requeridos: `!` en la propiedad, sin `@IsOptional()`
- Campos opcionales: `?` en la propiedad, con `@IsOptional()`
- Enums propios van en el mismo archivo del CreateDto
- `athlete_id` nunca en UpdateDto si no se puede cambiar (usar `PartialType` y el service ignora el campo)

---

## Permisos por rol

### A nivel de clase (aplica a todos los endpoints del controller)
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('athletes')
export class AthletesController {}
```

### A nivel de endpoint
```typescript
// Sin @Roles → cualquier usuario autenticado puede acceder
@Get()
findAll() {}

// Con @Roles → solo los roles listados
@Roles('super_admin', 'admin')
@Post()
create() {}

@Roles('super_admin', 'admin', 'trainer')
@Patch(':id')
update() {}

@Roles('super_admin')
@Delete(':id')
remove() {}
```

### Convención de roles por acción
| Acción | Roles típicos |
|--------|---------------|
| GET (lista/detalle) | todos los autenticados |
| POST (crear) | super_admin, admin |
| PATCH (editar) | super_admin, admin, trainer (según módulo) |
| DELETE | super_admin solamente |
| Acciones especiales (freeze, cancel, confirm) | super_admin, admin |

### Acceder al usuario del JWT en el controller
```typescript
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Get()
async findAll(@CurrentUser() user: any) {
  // user.id    → UUID del usuario en public.users
  // user.email → email
  // user.role  → 'super_admin' | 'admin' | 'trainer' | 'nutritionist'

  // Patrón estándar para filtrar por rol trainer:
  if (user.role === 'trainer') {
    const myTrainerId = await this.service.getTrainerIdByUserId(user.id);
    if (!myTrainerId) return [];
    return this.service.findAll(myTrainerId);
  }
  return this.service.findAll(trainerId);
}
```

### CRÍTICO: trainer_id ≠ user_id
El `trainer_id` que va en `sessions`, `athletes`, etc. es el ID de la tabla `trainers`,
NO el `user.id` del JWT. Siempre resolverlo con:
```typescript
async getTrainerIdByUserId(userId: string): Promise<string | null> {
  const { data } = await this.supabase.db
    .from('trainers')
    .select('id')
    .eq('user_id', userId)
    .single();
  return data?.id ?? null;
}
```

---

## Patrón completo de un controller

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('xxx')
export class XxxController {
  constructor(private readonly xxx: XxxService) {}

  @Get()
  findAll(@Query('athlete_id') athleteId?: string) {
    return this.xxx.findAll(athleteId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.xxx.findOne(id);
  }

  @Roles('super_admin', 'admin')
  @Post()
  create(@Body() dto: CreateXxxDto) {
    return this.xxx.create(dto);
  }

  @Roles('super_admin', 'admin')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateXxxDto) {
    return this.xxx.update(id, dto);
  }

  @Roles('super_admin')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.xxx.remove(id);
  }
}
```

---

## Errores estándar

```typescript
import { NotFoundException, BadRequestException } from '@nestjs/common';

throw new NotFoundException(`Recurso ${id} no encontrado`);
throw new BadRequestException(error.message);   // error de Supabase
throw new BadRequestException('Mensaje claro para el usuario');
```

La `ValidationPipe` global con `whitelist: true` y `forbidNonWhitelisted: true` ya rechaza
campos desconocidos antes de llegar al controller. No validar manualmente lo que el DTO ya valida.
