#!/bin/bash
# =====================================================
# FORZA - Backup de base de datos Supabase
# =====================================================
# Uso: ./scripts/backup-supabase.sh
# Crea un archivo SQL con todo el esquema y datos
# =====================================================

# Configuración (obtener de Supabase Dashboard → Settings → Database)
DB_HOST="db.nhegevwfgunvberilthm.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"
# DB_PASSWORD se pedirá al ejecutar

# Nombre del archivo de backup
BACKUP_FILE="backups/forza_backup_$(date +%Y%m%d_%H%M%S).sql"

# Crear directorio de backups si no existe
mkdir -p backups

echo "🔄 Creando backup de la base de datos..."
echo "Host: $DB_HOST"
echo "Database: $DB_NAME"
echo ""

# Ejecutar pg_dump
pg_dump \
  --host=$DB_HOST \
  --port=$DB_PORT \
  --username=$DB_USER \
  --dbname=$DB_NAME \
  --no-owner \
  --no-privileges \
  --schema=public \
  --file=$BACKUP_FILE

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Backup creado exitosamente:"
  echo "   $BACKUP_FILE"
  echo ""
  echo "Tamaño: $(du -h $BACKUP_FILE | cut -f1)"
  echo ""
  echo "Para restaurar (si es necesario):"
  echo "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $BACKUP_FILE"
else
  echo ""
  echo "❌ Error al crear backup"
  exit 1
fi
