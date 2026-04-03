import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { GoogleLoginProvider, SocialAuthService, SocialLoginModule } from '@abacritt/angularx-social-login';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SocialLoginModule],
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

  constructor(
    private authService: AuthService,
    private router: Router,
    private socialAuthService: SocialAuthService
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
        const user = this.authService.getCurrentUser();
        if (user?.role === 'admin') {
          this.router.navigate(['/admin']);
        } else if (user?.role === 'aluno') {
          this.router.navigate(['/aluno']);
        }
      },
      error: (err) => {
        this.error = err.error?.detail || 'Erro ao fazer login';
        this.loading = false;
      }
    });
  }

  async loginWithGoogle(): Promise<void> {
    if (!this.googleConfigured) {
      this.error = 'Configure o Google Client ID em src/environments/environment.ts para habilitar o login Google.';
      return;
    }

    this.googleLoading = true;
    this.error = '';

    try {
      const googleUser = await this.socialAuthService.signIn(GoogleLoginProvider.PROVIDER_ID);
      if (!googleUser.idToken) {
        throw new Error('Não foi possível obter o token do Google');
      }

      await firstValueFrom(this.authService.loginWithGoogle(googleUser.idToken));
      await this.router.navigate(['/admin/dashboard']);
    } catch (error: unknown) {
      const fallbackMessage = 'Erro ao fazer login com Google';
      if (error instanceof HttpErrorResponse) {
        this.error = error.error?.message || fallbackMessage;
      } else if (error instanceof Error) {
        this.error = error.message || fallbackMessage;
      } else {
        this.error = fallbackMessage;
      }
    } finally {
      this.googleLoading = false;
    }
  }

  private hasValidGoogleClientId(): boolean {
    const clientId = environment.googleClientId?.trim() || '';
    return (
      clientId.endsWith('.apps.googleusercontent.com') &&
      !clientId.includes('SEU_GOOGLE_CLIENT_ID')
    );
  }
}
