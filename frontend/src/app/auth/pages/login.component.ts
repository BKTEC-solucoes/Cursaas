import { AfterViewInit, Component, ElementRef, ViewChild, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { GoogleIdentityService } from '../../core/services/google-identity.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements AfterViewInit {
  email    = '';
  password = '';
  showPassword  = false;
  loading       = false;
  googleLoading = false;
  error         = '';
  googleConfigured = this.googleIdentity.configurado();

  /** Container onde o GIS desenha o botão oficial do Google. */
  @ViewChild('googleBtn') googleBtn?: ElementRef<HTMLDivElement>;

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
    private googleIdentity: GoogleIdentityService,
  ) {}

  ngAfterViewInit(): void {
    if (!this.googleConfigured || !this.googleBtn) {
      return;
    }

    this.googleIdentity
      .renderizarBotao(
        this.googleBtn.nativeElement,
        (idToken) => this.autenticarComGoogle(idToken),
        { modoEscuro: this.darkMode() },
      )
      .catch(() => {
        // Rede bloqueada, adblock ou Google fora do ar. O login por e-mail
        // continua funcionando, então some com o botão em vez de deixar uma
        // caixa vazia na tela.
        this.googleConfigured = false;
      });
  }

  login(): void {
    if (!this.email || !this.password) {
      this.error = 'Email e senha são obrigatórios';
      return;
    }
    this.loading = true;
    this.error   = '';

    this.authService.login(this.email, this.password).subscribe({
      next: () => this.aplicarTemaERedirecionar(),
      error: (err) => {
        this.error   = err.error?.detail || 'Erro ao fazer login';
        this.loading = false;
      }
    });
  }

  /**
   * Troca o idToken do Google por um JWT da aplicação.
   *
   * O side-car não cria conta: e-mail sem cadastro no Cursaas volta 403, e a
   * mensagem precisa dizer isso, senão o usuário fica tentando de novo achando
   * que errou a senha. Provisionamento continua sendo por convite, aprovação de
   * solicitação ou criação pela instituição.
   */
  private autenticarComGoogle(idToken: string): void {
    this.googleLoading = true;
    this.error = '';

    this.authService.loginWithGoogle(idToken).subscribe({
      next: () => this.aplicarTemaERedirecionar(),
      error: (err) => {
        this.googleLoading = false;
        // Não deixa a conta escolhida grudada: sem isso, tentar de novo com
        // outro e-mail reenviaria silenciosamente o mesmo idToken.
        this.googleIdentity.encerrarSessaoGoogle();

        this.error = err.status === 403
          ? (err.error?.message
              || 'Esta conta Google não tem acesso ao Cursaas. Peça um convite à sua instituição.')
          : (err.error?.message || 'Não foi possível entrar com o Google. Tente novamente.');
      },
    });
  }

  /**
   * Caminho comum aos dois logins: o tema do tenant precisa ser aplicado ANTES
   * da navegação, senão a área autenticada monta com as cores do tenant
   * anterior (ou com as do fallback) e troca na cara do usuário.
   */
  private aplicarTemaERedirecionar(): void {
    const token = this.authService.getToken() ?? '';
    this.themeService.carregarEAplicar(token).subscribe(() => {
      const user = this.authService.getCurrentUser();
      if      (user?.role === 'admin')       this.router.navigate(['/admin']);
      else if (user?.role === 'aluno')       this.router.navigate(['/aluno']);
      else if (user?.role === 'instituicao') this.router.navigate(['/instituicao']);
    });
  }
}

