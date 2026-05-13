import { Injectable, signal } from '@angular/core';

export interface Toast {
  id:      number;
  message: string;
  type:    'success' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);
  private counter = 0;

  show(message: string, type: 'success' | 'error' | 'info' = 'success') {
    const id = ++this.counter;
    this.toasts.update(t => [...t, { id, message, type }]);

    // Auto eliminar después de 3 segundos
    setTimeout(() => this.remove(id), 3000);
  }

  remove(id: number) {
    this.toasts.update(t => t.filter(toast => toast.id !== id));
  }

  success(message: string) { this.show(message, 'success'); }
  error(message: string)   { this.show(message, 'error'); }
  info(message: string)    { this.show(message, 'info'); }
}
