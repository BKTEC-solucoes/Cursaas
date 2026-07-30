import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { environment } from '../../environments/environment';
import { ThemeService } from '../core/services/theme.service';

interface CursoPublico {
  id: number;
  nome: string;
  descricao: string | null;
  pago: boolean;
  valor: string | null;
}

interface TemaPublico {
  faculdade_id: number;
  nome: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

/**
 * Marketplace público de UMA faculdade, em `/f/:slug`.
 *
 * Página aberta — sem authGuard: é a vitrine que a instituição divulga. O tenant
 * vem do slug na URL, nunca de sessão, e é ele que escopa tanto os cursos quanto
 * a identidade visual aplicada.
 */
@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="mkt">
      <header class="mkt-header">
        <div class="mkt-header-inner">
          <div class="mkt-brand">
            <img *ngIf="tema?.logo_url" [src]="tema!.logo_url" [alt]="tema!.nome" class="mkt-logo" />
            <span class="mkt-nome">{{ tema?.nome || (erro ? 'Cursaas' : 'Carregando...') }}</span>
          </div>
          <a routerLink="/login" class="mkt-entrar">Entrar</a>
        </div>
      </header>

      <main class="mkt-main">
        <div class="mkt-hero" *ngIf="!erro">
          <h1>Cursos disponíveis</h1>
          <p *ngIf="!carregando">
            {{ cursos.length }}
            {{ cursos.length === 1 ? 'curso aberto para matrícula' : 'cursos abertos para matrícula' }}
          </p>
        </div>

        <div class="mkt-estado" *ngIf="carregando">
          <div class="spinner"></div>
          <p>Carregando catálogo...</p>
        </div>

        <div class="mkt-estado mkt-erro" *ngIf="erro">
          <h2>{{ erro }}</h2>
          <p>Confira o endereço ou fale com a instituição.</p>
          <a routerLink="/" class="mkt-btn">Voltar ao início</a>
        </div>

        <div class="mkt-vazio" *ngIf="!carregando && !erro && cursos.length === 0">
          <p>Esta instituição ainda não publicou cursos.</p>
        </div>

        <div class="mkt-grid" *ngIf="!carregando && !erro && cursos.length > 0">
          <article class="mkt-card" *ngFor="let c of cursos">
            <div class="mkt-card-topo">
              <span class="mkt-tag" [class.pago]="c.pago">
                {{ c.pago ? 'Pago' : 'Gratuito' }}
              </span>
            </div>
            <h3>{{ c.nome }}</h3>
            <p class="mkt-desc">{{ c.descricao || 'Sem descrição.' }}</p>
            <div class="mkt-card-rodape">
              <span class="mkt-preco">
                {{ c.pago ? (+(c.valor || 0) | currency:'BRL':'symbol':'1.2-2') : 'Grátis' }}
              </span>
              <a routerLink="/login" class="mkt-btn mkt-btn-sm">
                {{ c.pago ? 'Solicitar acesso' : 'Matricular-se' }}
              </a>
            </div>
          </article>
        </div>
      </main>

      <footer class="mkt-footer" *ngIf="tema">
        <p>{{ tema.nome }} · powered by Cursaas</p>
      </footer>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .mkt { min-height: 100vh; display: flex; flex-direction: column; background: var(--background, #f8fafc); }

    .mkt-header { background: #fff; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 10; }
    .mkt-header-inner {
      max-width: 1100px; margin: 0 auto; padding: 14px 24px;
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
    }
    .mkt-brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .mkt-logo { height: 34px; width: auto; }
    .mkt-nome { font-weight: 700; color: #0f172a; font-size: 1.05rem; }
    .mkt-entrar {
      background: var(--primary, #1a6b3c); color: #fff; text-decoration: none;
      padding: 8px 18px; border-radius: var(--radius, 8px); font-weight: 600; font-size: .9rem;
      white-space: nowrap;
    }

    .mkt-main { flex: 1; max-width: 1100px; margin: 0 auto; padding: 40px 24px 60px; width: 100%; }
    .mkt-hero h1 { font-size: 1.9rem; font-weight: 800; color: #0f172a; margin: 0 0 6px; }
    .mkt-hero p { color: #64748b; margin: 0 0 32px; }

    .mkt-grid { display: grid; gap: 20px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
    .mkt-card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: var(--radius, 10px);
      padding: 20px; display: flex; flex-direction: column; gap: 10px;
      transition: box-shadow .18s, transform .18s;
    }
    .mkt-card:hover { box-shadow: 0 8px 24px rgba(15,23,42,.10); transform: translateY(-2px); }
    .mkt-card h3 { margin: 0; font-size: 1.08rem; color: #0f172a; line-height: 1.35; }
    .mkt-desc { color: #64748b; font-size: .9rem; line-height: 1.55; flex: 1; margin: 0; }
    .mkt-tag {
      display: inline-block; font-size: .72rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: .04em; padding: 4px 10px; border-radius: 999px;
      background: #dcfce7; color: #166534;
    }
    .mkt-tag.pago { background: #fef3c7; color: #92400e; }
    .mkt-card-rodape {
      display: flex; align-items: center; justify-content: space-between;
      gap: 10px; border-top: 1px solid #f1f5f9; padding-top: 12px; margin-top: 4px;
    }
    .mkt-preco { font-weight: 700; color: #0f172a; }

    .mkt-btn {
      background: var(--primary, #1a6b3c); color: #fff; text-decoration: none;
      padding: 9px 18px; border-radius: var(--radius, 8px); font-weight: 600; font-size: .88rem;
      display: inline-block;
    }
    .mkt-btn-sm { padding: 7px 14px; font-size: .82rem; }

    .mkt-estado { text-align: center; padding: 70px 20px; color: #64748b; }
    .mkt-erro h2 { color: #b91c1c; margin: 0 0 8px; }
    .mkt-vazio { text-align: center; padding: 60px 20px; color: #94a3b8; }
    .spinner {
      width: 34px; height: 34px; margin: 0 auto 14px;
      border: 3px solid #e2e8f0; border-top-color: var(--primary, #1a6b3c);
      border-radius: 50%; animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .mkt-footer {
      border-top: 1px solid #e2e8f0; background: #fff;
      padding: 18px 24px; text-align: center; color: #94a3b8; font-size: .85rem;
    }
  `],
})
export class MarketplaceComponent implements OnInit {
  slug = '';
  tema: TemaPublico | null = null;
  cursos: CursoPublico[] = [];
  carregando = true;
  erro = '';

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private themeService: ThemeService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.slug = params.get('slug') ?? '';
      if (!this.slug) {
        this.router.navigate(['/']);
        return;
      }
      this.carregarTema();
      this.carregarCursos();
    });
  }

  /**
   * Marca da instituição. `aplicarPorSlug` já busca o tema público E o aplica
   * nas CSS variables, caindo no tema padrão se o slug não existir — por isso
   * não há requisição separada aqui.
   */
  private carregarTema(): void {
    this.themeService.aplicarPorSlug(this.slug).subscribe({
      next: (tema) => { this.tema = tema as unknown as TemaPublico | null; },
      error: () => { /* catálogo continua visível com o tema padrão */ },
    });
  }

  private carregarCursos(): void {
    this.carregando = true;
    this.http
      .get<CursoPublico[]>(`${environment.apiUrl}/cursos/catalogo`, {
        params: { faculdade: this.slug },
      })
      .subscribe({
        next: (cursos) => {
          this.cursos = cursos;
          this.carregando = false;
        },
        error: (e) => {
          this.erro = e?.status === 404
            ? 'Instituição não encontrada'
            : 'Não foi possível carregar o catálogo';
          this.carregando = false;
        },
      });
  }
}
