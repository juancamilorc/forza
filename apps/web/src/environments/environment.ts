import { REAL_PLAN_LABELS } from './plan-labels.real';

const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';

export const environment = {
  production: !isLocal,
  demo: false,
  // WhatsApp de soporte del login (solo dígitos con indicativo); vacío oculta los enlaces
  supportWhatsapp: '573013771836',
  // Monto desde el cual el pago se puede dividir en cuotas
  installmentThreshold: 450_000,
  planLabels: REAL_PLAN_LABELS,
  apiUrl: isLocal
    ? 'http://localhost:3000/api'
    : 'https://forza-api-u7cq.onrender.com/api',
};
