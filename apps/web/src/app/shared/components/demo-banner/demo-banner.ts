import { Component } from '@angular/core';

// Aviso fijo del entorno de demostración. No intercepta clics.
@Component({
  selector: 'app-demo-banner',
  template: `
    <div class="demo-banner" role="status">
      <span class="material-symbols-outlined">science</span>
      Entorno de demostración · datos ficticios
    </div>
  `,
  styles: `
    .demo-banner {
      position: fixed;
      left: 50%;
      bottom: 12px;
      transform: translateX(-50%);
      z-index: 2000;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      border-radius: 999px;
      background: #c99734;
      color: #0d0d0d;
      font-family: 'Cairo', sans-serif;
      font-size: 13px;
      font-weight: 700;
      white-space: nowrap;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
      pointer-events: none;
    }
    .material-symbols-outlined { font-size: 18px; }
    @media (max-width: 480px) { .demo-banner { font-size: 12px; padding: 5px 12px; } }
  `,
})
export class DemoBanner {}
