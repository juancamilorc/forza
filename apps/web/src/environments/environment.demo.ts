// Build de demostración (nx build web --configuration=demo).
// apiUrl: reemplazar por la URL del servicio de API de la demo antes de desplegar.
export const environment = {
  production: true,
  demo: true,
  supportWhatsapp: '',
  installmentThreshold: 300_000,
  // Nombres genéricos; los valores guardados en la base no cambian.
  planLabels: {
    momentum:             'Plan Bronce',
    momentum_pro:         'Plan Bronce Plus',
    master:               'Plan Plata',
    master_pro:           'Plan Plata Plus',
    frz:                  'Plan Oro',
    frz_pro:              'Plan Oro Plus',
    elite:                'Plan Platino',
    elite_pro:            'Plan Platino Plus',
    addicted_to_football: 'Plan Libre',
  } as Record<string, string>,
  apiUrl: 'https://REEMPLAZAR-URL-API-DEMO/api',
};
