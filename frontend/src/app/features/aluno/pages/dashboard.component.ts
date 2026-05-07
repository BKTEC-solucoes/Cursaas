import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../shared/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

interface QuickAction {
  path:  string;
  label: string;
  desc:  string;
  icon:  string;
  color: string; /* CSS custom-property suffix: primary | success | warning | danger | info */
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    path:  '/aluno/cursos',
    label: 'Meus Cursos',
    desc:  'Visualizar cursos inscritos',
    color: 'primary',
    icon:  `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  },
  {
    path:  '/aluno/aulas',
    label: 'Aulas & Vídeos',
    desc:  'Assistir aulas do seu curso',
    color: 'info',
    icon:  `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
  },
  {
    path:  '/aluno/provas',
    label: 'Provas',
    desc:  'Responder avaliações',
    color: 'warning',
    icon:  `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  },
  {
    path:  '/aluno/notas',
    label: 'Minhas Notas',
    desc:  'Ver notas e desempenho',
    color: 'success',
    icon:  `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  },
  {
    path:  '/aluno/presenca',
    label: 'Presença',
    desc:  'Acompanhar frequência',
    color: 'danger',
    icon:  `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  },
  {
    path:  '/aluno/catalogo',
    label: 'Catálogo',
    desc:  'Explorar novos cursos',
    color: 'primary',
    icon:  `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  },
];

@Component({
  selector: 'app-aluno-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="content-page">

      <!-- ── Hero de boas-vindas ─────────────────────────── -->
      <div class="hero-card">
        <div class="hero-left">
          <p class="hero-eyebrow">Portal do Aluno</p>
          <h1 class="hero-title">Olá, {{ primeiroNome() }}! 👋</h1>
          <p class="hero-sub">Continue de onde parou. Você está indo bem!</p>
        </div>
        <div class="hero-right" aria-hidden="true">
          <div class="hero-deco">
            <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity=".25"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          </div>
        </div>
      </div>

      <!-- ── Cards de estatísticas ───────────────────────── -->
      <section class="section">
        <h2 class="section-title">Resumo</h2>
        @if (loading()) {
          <div class="stat-grid">
            @for (_ of [1,2,3]; track $index) {
              <div class="stat-card skeleton-card"></div>
            }
          </div>
        } @else {
          <div class="stat-grid">
            <div class="stat-card">
              <div class="stat-icon stat-icon--primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              </div>
              <div>
                <div class="stat-value">{{ meusCursos() }}</div>
                <div class="stat-label">Cursos Inscritos</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon stat-icon--success">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              </div>
              <div>
                <div class="stat-value">{{ minhasNotas() }}</div>
                <div class="stat-label">Notas Registradas</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon stat-icon--info">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div>
                <div class="stat-value">{{ minhaPresenca() }}<span class="stat-unit">%</span></div>
                <div class="stat-label">Frequência Média</div>
                <div class="stat-delta" [class]="presencaDeltaClass()">{{ presencaDeltaLabel() }}</div>
              </div>
            </div>
          </div>
        }
      </section>

      <!-- ── Acesso rápido ───────────────────────────────── -->
      <section class="section">
        <h2 class="section-title">Acesso Rápido</h2>
        <div class="quick-grid">
          @for (item of actions; track item.path) {
            <a [routerLink]="item.path" class="quick-card quick-card--{{ item.color }}">
              <span class="quick-icon" [innerHTML]="item.icon"></span>
              <span class="quick-label">{{ item.label }}</span>
              <span class="quick-desc">{{ item.desc }}</span>
            </a>
          }
        </div>
      </section>

    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ── Hero ──────────────────────────────────────────── */
    .hero-card {
      display: flex; align-items: center; justify-content: space-between;
      background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
      color: #fff; border-radius: var(--radius-lg);
      padding: var(--space-8) var(--space-8);
      margin-bottom: var(--space-8); overflow: hidden; position: relative;
    }
    .hero-eyebrow {
      font-size: var(--font-size-xs); font-weight: 700; letter-spacing: .1em;
      text-transform: uppercase; opacity: .75; margin: 0 0 var(--space-2);
    }
    .hero-title {
      font-family: var(--font-display); font-size: clamp(1.5rem, 4vw, 2.25rem);
      font-weight: 800; margin: 0 0 var(--space-2); line-height: 1.15;
    }
    .hero-sub {
      margin: 0; font-size: var(--font-size-sm); opacity: .82;
    }
    .hero-right { flex-shrink: 0; }
    .hero-deco  { color: #fff; }

    /* ── Sections ──────────────────────────────────────── */
    .section         { margin-bottom: var(--space-8); }
    .section-title   {
      font-family: var(--font-display); font-size: var(--font-size-lg);
      font-weight: 700; color: var(--color-text);
      margin: 0 0 var(--space-4); letter-spacing: -.02em;
    }

    /* ── Stat cards ────────────────────────────────────── */
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--space-4);
    }
    .stat-card {
      display: flex; align-items: center; gap: var(--space-4);
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); padding: var(--space-5);
      box-shadow: var(--shadow-sm);
      transition: box-shadow var(--transition-fast), transform var(--transition-fast);
    }
    .stat-card:hover { box-shadow: var(--shadow); transform: translateY(-2px); }
    .skeleton-card   { min-height: 96px; border-radius: var(--radius-lg); }

    .stat-icon {
      width: var(--stat-card-icon-size, 48px); height: var(--stat-card-icon-size, 48px);
      border-radius: var(--radius); display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .stat-icon--primary { background: color-mix(in srgb, var(--primary) 14%, transparent);      color: var(--primary); }
    .stat-icon--success { background: color-mix(in srgb, var(--color-success) 14%, transparent); color: var(--color-success); }
    .stat-icon--info    { background: color-mix(in srgb, var(--color-info) 14%, transparent);    color: var(--color-info); }

    .stat-value {
      font-family: var(--font-display); font-size: var(--stat-card-value-size, var(--font-size-3xl));
      font-weight: 800; color: var(--color-text); line-height: 1; margin-bottom: 2px;
    }
    .stat-unit  { font-size: var(--font-size-lg); font-weight: 600; opacity: .65; }
    .stat-label { font-size: var(--font-size-sm); color: var(--color-text-muted); margin-bottom: 2px; }
    .stat-delta {
      display: inline-flex; align-items: center; gap: 2px;
      font-size: var(--font-size-xs); font-weight: 600;
      padding: 1px 6px; border-radius: var(--radius-full);
    }
    .stat-delta--ok  { background: color-mix(in srgb, var(--color-success) 14%, transparent); color: var(--color-success); }
    .stat-delta--mid { background: color-mix(in srgb, var(--color-warning) 14%, transparent); color: var(--color-warning); }
    .stat-delta--low { background: color-mix(in srgb, var(--color-danger) 14%, transparent);  color: var(--color-danger); }

    /* ── Quick actions ─────────────────────────────────── */
    .quick-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: var(--space-4);
    }
    .quick-card {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: var(--space-2); padding: var(--space-5) var(--space-4);
      background: var(--color-surface); border: 1.5px solid var(--color-border);
      border-radius: var(--radius-lg); text-decoration: none; color: var(--color-text);
      box-shadow: var(--shadow-sm); text-align: center;
      transition: box-shadow var(--transition-fast), transform var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast);
    }
    .quick-card:hover { box-shadow: var(--shadow); transform: translateY(-3px); }

    .quick-card--primary:hover { border-color: var(--primary);        background: color-mix(in srgb, var(--primary) 6%, var(--color-surface)); }
    .quick-card--success:hover { border-color: var(--color-success);  background: color-mix(in srgb, var(--color-success) 6%, var(--color-surface)); }
    .quick-card--warning:hover { border-color: var(--color-warning);  background: color-mix(in srgb, var(--color-warning) 6%, var(--color-surface)); }
    .quick-card--danger:hover  { border-color: var(--color-danger);   background: color-mix(in srgb, var(--color-danger) 6%, var(--color-surface)); }
    .quick-card--info:hover    { border-color: var(--color-info);     background: color-mix(in srgb, var(--color-info) 6%, var(--color-surface)); }

    .quick-icon {
      display: flex; align-items: center; justify-content: center;
      width: 52px; height: 52px; border-radius: var(--radius);
      background: color-mix(in srgb, var(--primary) 10%, transparent);
      color: var(--primary); margin-bottom: var(--space-1);
    }
    .quick-card--success .quick-icon { background: color-mix(in srgb, var(--color-success) 10%, transparent); color: var(--color-success); }
    .quick-card--warning .quick-icon { background: color-mix(in srgb, var(--color-warning) 10%, transparent); color: var(--color-warning); }
    .quick-card--danger  .quick-icon { background: color-mix(in srgb, var(--color-danger) 10%, transparent);  color: var(--color-danger);  }
    .quick-card--info    .quick-icon { background: color-mix(in srgb, var(--color-info) 10%, transparent);    color: var(--color-info);    }

    .quick-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text); }
    .quick-desc  { font-size: var(--font-size-xs); color: var(--color-text-muted); line-height: 1.4; }

    /* ── Responsive ────────────────────────────────────── */
    @media (max-width: 600px) {
      .hero-card    { padding: var(--space-6); }
      .hero-right   { display: none; }
      .stat-grid    { grid-template-columns: 1fr; }
      .quick-grid   { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class AlunoDashboardComponent implements OnInit {
  readonly actions = QUICK_ACTIONS;

  readonly loading       = signal(true);
  readonly meusCursos    = signal(0);
  readonly minhasNotas   = signal(0);
  readonly minhaPresenca = signal(0);

  readonly primeiroNome = computed(() => this._nome.split(' ')[0]);

  readonly presencaDeltaClass = computed(() => {
    const v = this.minhaPresenca();
    if (v >= 75) return 'stat-delta stat-delta--ok';
    if (v >= 50) return 'stat-delta stat-delta--mid';
    return 'stat-delta stat-delta--low';
  });
  readonly presencaDeltaLabel = computed(() => {
    const v = this.minhaPresenca();
    if (v >= 75) return '✓ Regular';
    if (v >= 50) return '⚠ Atenção';
    return '✗ Baixa';
  });

  private _nome = '';

  constructor(private authService: AuthService, private apiService: ApiService) {}

  ngOnInit(): void {
    const usuario = this.authService.getCurrentUser();
    if (usuario) this._nome = usuario.nome;
    this.loadStats();
  }

  loadStats(): void {
    this.apiService.getCursos().subscribe({
      next: (cursos: any) => {
        this.meusCursos.set(Array.isArray(cursos) ? cursos.length : 0);
        this.loading.set(false);
      },
      error: () => {
        this.meusCursos.set(0);
        this.loading.set(false);
      },
    });
  }
}
