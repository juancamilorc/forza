import { Component, inject, OnInit, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private auth = inject(AuthService);

  user = this.auth.getCurrentUser();
  role = this.auth.getRole() ?? '';

  // Stats — por ahora con datos estáticos, después los conectamos al backend
  stats = signal({
    athletes:    0,
    sessions:    0,
    assessments: 0,
    payments:    0,
  });

  ngOnInit() {
    // Aquí  al backend después
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }
}
