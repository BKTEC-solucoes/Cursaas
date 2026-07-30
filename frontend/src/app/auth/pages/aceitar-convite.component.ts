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
    <div class="convite-container">
      <div class="convite-box">

        <!-- Carregando / token inválido -->
        <div *ngIf="estado === 'carregando'" class="estado-info">
          <div class="spinner-grande"></div>
          <p>Validando convite...</p>
        </div>

        <div *ngIf="estado === 'invalido'" class="estado-erro">
          <div class="icone-erro">✖</div>
          <h2>Convite inválido ou expirado</h2>
          <p>{{ erroValidacao }}</p>
          <a href="/auth/login" class="btn-login">Ir para o login</a>
        </div>

        <!-- Formulário de cadastro -->
        <ng-container *ngIf="estado === 'formulario'">
          <div class="convite-header">
            <div class="logo">🔐</div>
            <h1>Ativar conta</h1>
            <p class="subtitulo">
              Você foi convidado como <strong>{{ convite?.role_label }}</strong>
            </p>
            <span class="email-badge">{{ convite?.email }}</span>
          </div>

          <form (ngSubmit)="ativarConta()" class="form-convite">
            <div class="form-row">
              <label>Seu nome *</label>
              <input
                type="text"
                [(ngModel)]="nome"
                name="nome"
                required
                placeholder="Nome completo"
                (blur)="tocados.add('nome')"
                [class.campo-invalido]="tocados.has('nome') && !nome.trim()"
              />
              <span class="campo-erro" *ngIf="tocados.has('nome') && !nome.trim()">Campo obrigatório</span>
            </div>

            <div class="form-row">
              <label>Senha *</label>
              <div class="password-field">
                <input
                  [type]="mostrarSenha ? 'text' : 'password'"
                  [(ngModel)]="senha"
                  name="senha"
                  required
                  minlength="6"
                  placeholder="Mínimo 6 caracteres"
                  (blur)="tocados.add('senha')"
                  [class.campo-invalido]="tocados.has('senha') && !senha"
                />
                <button type="button" class="toggle-pw" (click)="mostrarSenha = !mostrarSenha">
                  {{ mostrarSenha ? 'Ocultar' : 'Mostrar' }}
                </button>
              </div>
              <div class="forca-senha" *ngIf="senha">
                <div class="forca-barras">
                  <div class="forca-barra" [style.background]="forcaSenha.score >= 1 ? forcaSenha.cor : '#e0e0e0'"></div>
                  <div class="forca-barra" [style.background]="forcaSenha.score >= 2 ? forcaSenha.cor : '#e0e0e0'"></div>
                  <div class="forca-barra" [style.background]="forcaSenha.score >= 3 ? forcaSenha.cor : '#e0e0e0'"></div>
                  <div class="forca-barra" [style.background]="forcaSenha.score >= 4 ? forcaSenha.cor : '#e0e0e0'"></div>
                </div>
                <span class="forca-texto" [style.color]="forcaSenha.cor">{{ forcaSenha.texto }}</span>
              </div>
              <span class="campo-erro" *ngIf="tocados.has('senha') && !senha">Senha obrigatória</span>
              <span class="campo-erro" *ngIf="tocados.has('senha') && senha && senha.length < 6">Mínimo 6 caracteres</span>
            </div>

            <div class="form-row">
              <label>Confirmar senha *</label>
              <div class="password-field">
                <input
                  [type]="mostrarSenhaConf ? 'text' : 'password'"
                  [(ngModel)]="confirmarSenha"
                  name="confirmarSenha"
                  required
                  placeholder="Repita a senha"
                  (blur)="tocados.add('confirmarSenha')"
                  [class.campo-invalido]="tocados.has('confirmarSenha') && confirmarSenha !== senha"
                />
                <button type="button" class="toggle-pw" (click)="mostrarSenhaConf = !mostrarSenhaConf">
                  {{ mostrarSenhaConf ? 'Ocultar' : 'Mostrar' }}
                </button>
              </div>
              <span class="campo-erro" *ngIf="tocados.has('confirmarSenha') && !confirmarSenha">Campo obrigatório</span>
              <span class="campo-erro" *ngIf="tocados.has('confirmarSenha') && confirmarSenha && confirmarSenha !== senha">As senhas não conferem</span>
            </div>

            <div class="form-erro" *ngIf="erro">{{ erro }}</div>

            <button type="submit" class="btn-ativar" [disabled]="salvando">
              <span *ngIf="salvando" class="spinner-btn"></span>
              {{ salvando ? 'Ativando conta...' : 'Ativar minha conta' }}
            </button>
          </form>
        </ng-container>

        <!-- Sucesso -->
        <div *ngIf="estado === 'sucesso'" class="estado-sucesso">
          <div class="icone-sucesso">✔</div>
          <h2>Conta ativada!</h2>
          <p>Sua conta de <strong>{{ convite?.role_label }}</strong> foi criada com sucesso.</p>
          <button class="btn-login" (click)="irParaLogin()">Fazer login agora</button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .convite-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .convite-box {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,.2);
      width: 100%;
      max-width: 420px;
      padding: 36px 32px;
    }

    .convite-header {
      text-align: center;
      margin-bottom: 28px;
    }
    .logo { font-size: 2.5rem; margin-bottom: 8px; }
    .convite-header h1 { margin: 0 0 6px; color: #2c3e50; font-size: 1.5rem; }
    .subtitulo { color: #666; font-size: .9rem; margin: 0 0 10px; }
    .email-badge {
      display: inline-block;
      background: #eaf4fb;
      color: #2980b9;
      padding: 4px 14px;
      border-radius: 20px;
      font-size: .85rem;
      font-weight: 600;
    }

    .form-row {
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin-bottom: 16px;
    }
    .form-row label { font-size: .88rem; font-weight: 600; color: #444; }
    .form-row input {
      padding: 10px 13px;
      border: 1px solid #ddd;
      border-radius: 7px;
      font-size: .92rem;
      outline: none;
      transition: border-color .2s;
      font-family: inherit;
    }
    .form-row input:focus { border-color: #667eea; }
    .campo-invalido { border-color: #e74c3c !important; }
    .campo-erro { font-size: .78rem; color: #e74c3c; font-weight: 500; }

    .password-field { display: flex; gap: 8px; align-items: center; }
    .password-field input { flex: 1; }
    .toggle-pw {
      padding: 9px 10px;
      border: 1px solid #ccc;
      background: #f8f9fa;
      border-radius: 7px;
      cursor: pointer;
      font-size: .8rem;
      white-space: nowrap;
    }
    .toggle-pw:hover { background: #ecf0f1; }

    .forca-senha { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
    .forca-barras { display: flex; gap: 4px; }
    .forca-barra { width: 40px; height: 5px; border-radius: 3px; transition: background .3s; }
    .forca-texto { font-size: .78rem; font-weight: 600; }

    .form-erro {
      padding: 10px 14px;
      background: #fdf2f2;
      border: 1px solid #f5c6c6;
      border-radius: 6px;
      color: #c0392b;
      font-size: .88rem;
      margin-bottom: 14px;
    }

    .btn-ativar {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 7px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: opacity .2s;
    }
    .btn-ativar:disabled { opacity: .65; cursor: not-allowed; }

    .spinner-btn {
      display: inline-block;
      width: 15px; height: 15px;
      border: 2px solid rgba(255,255,255,.35);
      border-top-color: white;
      border-radius: 50%;
      animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Estados */
    .estado-info, .estado-erro, .estado-sucesso {
      text-align: center;
      padding: 12px 0;
    }
    .estado-info p { color: #666; margin-top: 14px; }

    .spinner-grande {
      width: 44px; height: 44px;
      border: 4px solid #e0e0e0;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin .8s linear infinite;
      margin: 0 auto;
    }

    .icone-erro {
      width: 56px; height: 56px;
      background: #fadbd8;
      color: #e74c3c;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.6rem; font-weight: 700;
      margin: 0 auto 16px;
    }
    .estado-erro h2 { color: #c0392b; margin: 0 0 8px; }
    .estado-erro p { color: #666; font-size: .92rem; }

    .icone-sucesso {
      width: 56px; height: 56px;
      background: #d5f5e3;
      color: #27ae60;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.6rem; font-weight: 700;
      margin: 0 auto 16px;
    }
    .estado-sucesso h2 { color: #1e8449; margin: 0 0 8px; }
    .estado-sucesso p { color: #555; font-size: .92rem; }

    .btn-login {
      display: inline-block;
      margin-top: 18px;
      padding: 10px 28px;
      background: #3498db;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: .95rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: background .2s;
    }
    .btn-login:hover { background: #2980b9; }
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
