import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
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
  email    = '';
  password = '';
  showPassword  = false;
  loading       = false;
  googleLoading = false;
  error         = '';
  googleConfigured = this.hasValidGoogleClientId();

  private readonly _theme = toSignal(this.themeService.currentTheme$);

  readonly logoUrl  = toSignal(this.themeService.logoUrl$,  { initialValue: null as string | null });
  readonly darkMode = toSignal(this.themeService.darkMode$, { initialValue: false });

  /** Layout: 'centered' (default) | 'split-left' | 'split-right' */
  readonly loginLayout = computed(() => this._theme()?.login_layout ?? 'centered');

  /** true quando o layout usa painel lateral de branding */
  readonly isSplit = computed(() => this.loginLayout() !== 'centered');

  /** CSS background para o painel de branding */
  readonly brandingBg = computed((): string => {
    const t     = this._theme();
    const type  = t?.login_background_type  ?? 'gradient';
    const value = t?.login_background_value ?? '';
    const p = t?.primary_color   ?? '#1a6b3c';
    const s = t?.secondary_color ?? '#0f4b2a';

    if (type === 'color')              return value || p;
    if (type === 'image' && value)     return `url('${CSS.escape(value.replace(/'/g, '\\\''))}') center / cover no-repeat`;
    return `linear-gradient(135deg, ${p} 0%, ${s} 100%)`;
  });

  /** true quando o painel de branding usa imagem (overlay de contraste necessário) */
  readonly brandingIsImage = computed(() =>
    (this._theme()?.login_background_type ?? 'gradient') === 'image'
  );

  readonly messageTitle   = computed(() => this._theme()?.login_message_title ?? '');
  readonly messageBody    = computed(() =>
    this._theme()?.login_message_body ?? 'Acesse sua plataforma de ensino digital'
  );
  readonly institutionName = computed(() => this._theme()?.nome ?? 'Cursaas');

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
    this.error   = '';

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        const token = this.authService.getToken() ?? '';
        this.themeService.carregarEAplicar(token).subscribe(() => {
          const user = this.authService.getCurrentUser();
          if      (user?.role === 'admin')      this.router.navigate(['/admin']);
          else if (user?.role === 'aluno')      this.router.navigate(['/aluno']);
          else if (user?.role === 'instituicao') this.router.navigate(['/instituicao']);
        });
      },
      error: (err) => {
        this.error   = err.error?.detail || 'Erro ao fazer login';
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

