import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/**
 * Componente sem template que redireciona o usuário autenticado
 * para a área correta de acordo com seu papel (role).
 */
@Component({
  selector: 'app-dashboard-redirect',
  standalone: true,
  template: ''
})
export class DashboardRedirectComponent implements OnInit {
  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();

    if (user?.role === 'admin') {
      this.router.navigate(['/admin']);
    } else if (user?.role === 'aluno') {
      this.router.navigate(['/aluno']);
    } else if (user?.role === 'instituicao') {
      this.router.navigate(['/instituicao']);
    } else {
      this.router.navigate(['/login']);
    }
  }
}
