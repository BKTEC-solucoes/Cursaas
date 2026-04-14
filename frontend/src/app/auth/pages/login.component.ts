import { Component, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email = '';
  password = '';
  showPassword = false;
  loading = false;
  googleLoading = false;
  error = '';
  googleConfigured = this.hasValidGoogleClientId();

  /** Emite a URL do logo quando o tema é carregado */
  readonly logoUrl$ = this.themeService.logoUrl$;

  constructor(
    private authService: AuthService,
    private router: Router,
    private themeService: ThemeService,
  ) {}

  login(): void {
    if (!this.email || !this.password) {
      this.error = 'Email e senha são obrigatórios';
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        const token = this.authService.getToken() ?? '';
        // Busca e aplica o tema da faculdade antes de navegar
        this.themeService.carregarEAplicar(token).subscribe(() => {
          const user = this.authService.getCurrentUser();
          if (user?.role === 'admin') {
            this.router.navigate(['/admin']);
          } else if (user?.role === 'aluno') {
            this.router.navigate(['/aluno']);
          } else if (user?.role === 'instituicao') {
            this.router.navigate(['/instituicao']);
          }
        });
      },
      error: (err) => {
        this.error = err.error?.detail || 'Erro ao fazer login';
        this.loading = false;
      }
    });
  }

  async loginWithGoogle(): Promise<void> {
    this.error = 'Login com Google não está configurado. Use o login padrão com email e senha.';
  }

  private hasValidGoogleClientId(): boolean {
    const clientId = environment.googleClientId?.trim() || '';
    return (
      clientId.endsWith('.apps.googleusercontent.com') &&
      !clientId.includes('SEU_GOOGLE_CLIENT_ID')
    );
  }
}
