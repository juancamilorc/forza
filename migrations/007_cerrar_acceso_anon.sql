-- FOR-90 (fase 1): cerrar el acceso de la clave pública `anon` a todas las tablas.
--
-- Problema: varias tablas tenían RLS activado pero con políticas permisivas
-- (USING (true)) que NO eran necesarias para el backend (usa service_role, que
-- ignora RLS) y dejaban leer las tablas a cualquiera con la clave anon.
--
-- Solución: RLS activado en TODAS las tablas de public, SIN ninguna política, y
-- sin privilegios directos para anon/authenticated. El backend no se afecta.
--
-- Reversión (si algo inesperado se rompiera): crear una política puntual por tabla,
-- p. ej. CREATE POLICY x ON public.<tabla> FOR SELECT TO authenticated USING (...);

DO $$
DECLARE
  t record;
  p record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    FOR p IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t.tablename
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t.tablename);
    END LOOP;
  END LOOP;
END $$;

REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- Verificación: todas con RLS activado y 0 políticas
SELECT c.relname AS tabla,
       c.relrowsecurity AS rls_activado,
       (SELECT count(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS politicas
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;
