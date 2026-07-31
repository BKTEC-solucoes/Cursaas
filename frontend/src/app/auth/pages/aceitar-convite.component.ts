import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ConviteInfo {
  email: string;
  admin_role: string;
  role_label: string;
}

@Component({
  selector: 'app-aceitar-convite',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-page">

      @if (estado === 'carregando') {
        <div class="auth-card" style="text-align:center;padding:var(--space-10,40px)">
          <div class="spinner" style="margin:0 auto var(--space-4,16px)"></div>
          <p style="color:var(--color-text-muted)">Validando convite...</p>
        </div>
      }

      @if (estado === 'invalido') {
        <div class="auth-card" style="text-align:center">
          <div class="state-icon state-icon--danger">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
          <h2 class="auth-heading">Convite invalido ou expirado</h2>
          <p class="auth-sub" style="margin-bottom:var(--space-5,20px)">{{ erroValidacao }}</p>
          <a href="/auth/login" class="btn btn-primary">Ir para o login</a>
        </div>
      }

      @if (estado === 'formulario') {
        <div class="auth-card">
          <div class="auth-brand">
            <div class="state-icon state-icon--primary" style="margin:0 auto var(--space-3,12px)">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <h1 class="auth-heading">Ativar conta</h1>
            <p class="auth-sub">Voce foi convidado como <strong>{{ convite?.role_label }}</strong></p>
            <span class="email-chip">{{ convite?.email }}</span>
          </div>

          <form (ngSubmit)="ativarConta()">
            <div class="field">
              <label class="field-label">Seu nome *</label>
              <input class="field-input" [class.field-input--error]="tocados.has('nome') && !nome.trim()"
                type="text" [(ngModel)]="nome" name="nome" required
                placeholder="Nome completo" (blur)="tocados.add('nome')" />
              @if (tocados.has('nome') && !nome.trim()) {
                <span class="field-error">Campo obrigatorio</span>
              }
            </div>

            <div class="field">
              <label class="field-label">Senha *</label>
              <div class="password-wrap">
                <input class="field-input"
                  [class.field-input--error]="tocados.has('senha') && !senha"
                  [type]="mostrarSenha ? 'text' : 'password'"
                  [(ngModel)]="senha" name="senha" required minlength="6"
                  placeholder="Minimo 6 caracteres" (blur)="tocados.add('senha')" />
                <button type="button" class="btn btn-ghost btn-sm" (click)="mostrarSenha = !mostrarSenha">
                  {{ mostrarSenha ? 'Ocultar' : 'Mostrar' }}
                </button>
              </div>
              @if (senha) {
                <div class="strength-row">
                  <div class="strength-bars">
                    @for (i of [1,2,3,4]; track i) {
                      <div class="strength-bar" [class.strength-bar--filled]="forcaSenha.score >= i" [style.background]="forcaSenha.score >= i ? forcaSenha.cor : ''"></div>
                    }
                  </div>
                  <span class="strength-label" [style.color]="forcaSenha.cor">{{ forcaSenha.texto }}</span>
                </div>
              }
              @if (tocados.has('senha') && !senha) { <span class="field-error">Senha obrigatoria</span> }
              @if (tocados.has('senha') && senha && senha.length < 6) { <span class="field-error">Minimo 6 caracteres</span> }
            </div>

            <div class="field">
              <label class="field-label">Confirmar senha *</label>
              <div class="password-wrap">
                <input class="field-input"
                  [class.field-input--error]="tocados.has('confirmarSenha') && confirmarSenha !== senha"
                  [type]="mostrarSenhaConf ? 'text' : 'password'"
                  [(ngModel)]="confirmarSenha" name="confirmarSenha" required
                  placeholder="Repita a senha" (blur)="tocados.add('confirmarSenha')" />
                <button type="button" class="btn btn-ghost btn-sm" (click)="mostrarSenhaConf = !mostrarSenhaConf">
                  {{ mostrarSenhaConf ? 'Ocultar' : 'Mostrar' }}
                </button>
              </div>
              @if (tocados.has('confirmarSenha') && !confirmarSenha) { <span class="field-error">Campo obrigatorio</span> }
              @if (tocados.has('confirmarSenha') && confirmarSenha && confirmarSenha !== senha) { <span class="field-error">As senhas nao conferem</span> }
            </div>

            @if (erro) { <div class="msg msg-error" style="margin-bottom:var(--space-4,16px)">{{ erro }}</div> }

            <button type="submit" class="btn btn-primary btn-full" [disabled]="salvando">
              @if (salvando) { <span class="spinner-sm"></span> }
              {{ salvando ? 'Ativando conta...' : 'Ativar minha conta' }}
            </button>
          </form>
        </div>
      }

      @if (estado === 'sucesso') {
        <div class="auth-card" style="text-align:center">
          <div class="state-icon state-icon--success">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 class="auth-heading">Conta ativada!</h2>
          <p class="auth-sub" style="margin-bottom:var(--space-5,20px)">Sua conta de <strong>{{ convite?.role_label }}</strong> foi criada com sucesso.</p>
          <button class="btn btn-primary" (click)="irParaLogin()">Fazer login agora</button>
        </div>
      }

    </div>
  `,
  styles: [`
    .auth-page { display:flex; justify-content:center; align-items:center; min-height:100vh; background:var(--color-surface-2,#f8fafc); padding:var(--space-6,24px) var(--space-4,16px); }
    .auth-card { width:100%; max-width:460px; background:var(--color-surface,#fff); border:1px solid var(--color-border,#e2e8f0); border-radius:var(--radius-lg,12px); padding:var(--space-10,40px) var(--space-8,32px); box-shadow:var(--shadow-lg,0 10px 30px rgba(0,0,0,.08)); }
    .auth-brand { text-align:center; margin-bottom:var(--space-6,24px); }
    .auth-heading { font-size:var(--font-size-xl,1.5rem); font-weight:700; color:var(--color-text,#1e293b); margin:0 0 var(--space-1,4px); }
    .auth-sub { font-size:var(--font-size-sm,.875rem); color:var(--color-text-muted,#64748b); margin:0 0 var(--space-2,8px); }
    .email-chip { display:inline-block; background:color-mix(in srgb,var(--primary,#3b82f6) 10%,var(--color-surface,#fff)); color:var(--primary,#3b82f6); padding:var(--space-1,4px) var(--space-3,12px); border-radius:var(--radius-full,999px); font-size:var(--font-size-sm,.875rem); font-weight:600; border:1px solid color-mix(in srgb,var(--primary,#3b82f6) 20%,transparent); }
    .state-icon { width:56px; height:56px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
    .state-icon--danger { background:color-mix(in srgb,var(--color-danger,#dc2626) 10%,transparent); color:var(--color-danger,#dc2626); }
    .state-icon--success { background:color-mix(in srgb,var(--color-success,#22c55e) 10%,transparent); color:var(--color-success,#22c55e); margin:0 auto var(--space-4,16px); }
    .state-icon--primary { background:color-mix(in srgb,var(--primary,#3b82f6) 10%,transparent); color:var(--primary,#3b82f6); }
    .field { display:flex; flex-direction:column; gap:var(--space-1,4px); margin-bottom:var(--space-4,16px); }
    .field-label { font-size:var(--font-size-sm,.875rem); font-weight:500; color:var(--color-text,#1e293b); }
    .field-input { border:1px solid var(--color-border,#e2e8f0); border-radius:var(--radius,6px); padding:var(--space-2,8px) var(--space-3,12px); font-size:var(--font-size-sm,.875rem); background:var(--color-surface,#fff); color:var(--color-text,#1e293b); outline:none; transition:border-color .15s; font-family:inherit; width:100%; box-sizing:border-box; }
    .field-input:focus { border-color:var(--primary,#3b82f6); box-shadow:0 0 0 3px color-mix(in srgb,var(--primary,#3b82f6) 12%,transparent); }
    .field-input--error { border-color:var(--color-danger,#dc2626) !important; }
    .field-error { font-size:var(--font-size-xs,.75rem); color:var(--color-danger,#dc2626); }
    .password-wrap { display:flex; gap:var(--space-2,8px); align-items:center; }
    .password-wrap .field-input { flex:1; }
    .strength-row { display:flex; align-items:center; gap:var(--space-2,8px); margin-top:var(--space-1,4px); }
    .strength-bars { display:flex; gap:4px; }
    .strength-bar { width:36px; height:4px; border-radius:2px; background:var(--color-border,#e2e8f0); transition:background .2s; }
    .strength-bar--filled { background:var(--color-success,#22c55e); }
    .strength-label { font-size:var(--font-size-xs,.75rem); font-weight:500; }
    .btn-full { width:100%; justify-content:center; margin-top:var(--space-2,8px); }
    .spinner { display:inline-block; width:36px; height:36px; border:3px solid var(--color-border,#e2e8f0); border-top-color:var(--primary,#3b82f6); border-radius:50%; animation:spin .8s linear infinite; }
    .spinner-sm { display:inline-block; width:14px; height:14px; border:2px solid rgba(255,255,255,.4); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
  `]
})
export class AceitarConviteComponent implements OnInit {
  estado: 'carregando' | 'invalido' | 'formulario' | 'sucesso' = 'carregando';
  convite: ConviteInfo | null = null;
  erroValidacao = '';

  nome = '';
  senha = '';
  confirmarSenha = '';
  mostrarSenha = false;
  mostrarSenhaConf = false;
  salvando = false;
  erro = '';
  tocados = new Set<string>();

  private token = '';
  private readonly api = `${environment.apiUrl}/convites`;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.erroValidacao = 'Token não informado na URL.';
      this.estado = 'invalido';
      return;
    }
    this.http.get<ConviteInfo>(`${this.api}/validar?token=${this.token}`).subscribe({
      next: (info) => { this.convite = info; this.estado = 'formulario'; },
      error: (err) => {
        this.erroValidacao = err?.error?.detail ?? 'Convite inválido ou expirado.';
        this.estado = 'invalido';
      },
    });
  }

  get forcaSenha(): { score: number; texto: string; cor: string } {
    const s = this.senha;
    if (!s) return { score: 0, texto: '', cor: '' };
    let pts = 0;
    if (s.length >= 6) pts++;
    if (s.length >= 10) pts++;
    if (/[A-Z]/.test(s) && /[a-z]/.test(s)) pts++;
    if (/[0-9]/.test(s)) pts++;
    if (/[^A-Za-z0-9]/.test(s)) pts++;
    const nivel = pts <= 1 ? 1 : pts <= 2 ? 2 : pts <= 3 ? 3 : 4;
    const textos = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'];
    const cores  = ['', '#e74c3c', '#e67e22', '#f1c40f', '#27ae60'];
    return { score: nivel, texto: textos[nivel], cor: cores[nivel] };
  }

  ativarConta(): void {
    ['nome', 'senha', 'confirmarSenha'].forEach(c => this.tocados.add(c));
    this.erro = '';

    if (!this.nome.trim()) { this.erro = 'Preencha seu nome.'; return; }
    if (!this.senha || this.senha.length < 6) { this.erro = 'A senha deve ter pelo menos 6 caracteres.'; return; }
    if (this.senha !== this.confirmarSenha) { this.erro = 'As senhas não conferem.'; return; }

    this.salvando = true;
    this.http.post<any>(`${this.api}/aceitar`, {
      token: this.token,
      nome: this.nome.trim(),
      senha: this.senha,
    }).subscribe({
      next: () => { this.salvando = false; this.estado = 'sucesso'; },
      error: (err) => {
        this.salvando = false;
        this.erro = err?.error?.detail ?? 'Erro ao ativar conta. Tente novamente.';
      },
    });
  }

  irParaLogin(): void {
    this.router.navigate(['/login']);
  }
}
