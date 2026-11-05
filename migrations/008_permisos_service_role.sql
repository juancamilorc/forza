-- =====================================================================
-- FORZA - Permisos explícitos: solo service_role sobre las tablas de public
-- =====================================================================
-- Contexto: en los proyectos de Supabase con "Automatically expose new tables"
-- DESACTIVADO (el valor por defecto para proyectos nuevos desde 2026), las tablas
-- nuevas de public NO reciben permisos por defecto, ni siquiera para service_role.
-- Aunque service_role ignora RLS, sin GRANT la API falla con
--   42501 "permission denied for table ..."
--
-- Qué hace (idempotente; se puede ejecutar más de una vez):
--   1. Da a service_role SELECT/INSERT/UPDATE/DELETE en todas las tablas de public,
--      USAGE/SELECT en las secuencias y EXECUTE en las funciones.
--   2. Deja lo mismo como valor por defecto para objetos futuros del rol postgres.
--   3. No da NADA a anon ni a authenticated: les quita lo que tengan.
--
-- ORDEN en un proyecto nuevo: 000_baseline.sql -> 007_cerrar_acceso_anon.sql -> este.
-- (Es segura también en un proyecto existente: solo agrega permisos a service_role.)
-- Referencia: https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically
-- =====================================================================

-- 1) service_role: lo que la API necesita
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 2) Valores por defecto para lo que se cree después con el rol postgres
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO service_role;

-- 3) anon y authenticated: nada (ni ahora ni por defecto)
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
-- Las funciones de trigger siguen disparándose: EXECUTE solo se comprueba al crear el trigger.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- Verificación: una fila por tabla. Esperado en TODAS:
--   rls = true, anon_select = false, authenticated_select = false, service_role_ok = true
SELECT c.relname AS tabla,
       c.relrowsecurity AS rls,
       has_table_privilege('anon', c.oid, 'SELECT')          AS anon_select,
       has_table_privilege('authenticated', c.oid, 'SELECT') AS authenticated_select,
       (has_table_privilege('service_role', c.oid, 'SELECT')
        AND has_table_privilege('service_role', c.oid, 'INSERT')
        AND has_table_privilege('service_role', c.oid, 'UPDATE')
        AND has_table_privilege('service_role', c.oid, 'DELETE')) AS service_role_ok
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;
