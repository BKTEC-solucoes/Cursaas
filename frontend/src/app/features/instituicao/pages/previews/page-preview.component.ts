import {
  Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy, ElementRef, Renderer2,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageOverride } from '../../../../core/services/theme.service';

export type PreviewPage = 'dashboard' | 'alunos' | 'cursos' | 'aulas' | 'notas' | 'perfil';

/** Tema base que pode chegar misturado com o override */
export interface PreviewTheme extends PageOverride {
  font_family?:    string;
  spacing?:        string;
  layout_type?:    string;
  dark_mode?:      boolean;
  logo_url?:       string | null;
  nome?:           string;
}

// Tokens CSS necessários para os previews (mapeados a partir dos campos do tema)
const PREVIEW_SPACING: Record<string, string> = {
  compact:     '0.75rem',
  comfortable: '1rem',
  spacious:    '1.25rem',
};

@Component({
  selector: 'app-page-preview',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Wrapper isolado: todas as CSS vars são aplicadas inline aqui -->
    <div class="preview-host" [ngStyle]="cssVars">

      @switch (page) {

        @case ('dashboard') {
          <div class="mock-shell">
            <div class="mock-sidebar-mini">
              <div class="mock-sidebar-logo"></div>
              @for (item of dashItems; track item) {
                <div class="mock-sidebar-item" [class.active]="item.active">
                  <span class="mock-item-dot"></span>
                  <span class="mock-item-label">{{ item.label }}</span>
                </div>
              }
            </div>
            <div class="mock-content">
              <div class="mock-welcome-card">
                <div class="mock-welcome-title">Bem-vindo!</div>
                <div class="mock-welcome-sub">Painel da instituição</div>
              </div>
              <div class="mock-stat-row">
                @for (stat of dashStats; track stat.label) {
                  <div class="mock-stat-card">
                    <div class="mock-stat-value">{{ stat.value }}</div>
                    <div class="mock-stat-label">{{ stat.label }}</div>
                  </div>
                }
              </div>
              <div class="mock-quick-actions">
                <div class="mock-section-title">Ações Rápidas</div>
                <div class="mock-action-row">
                  @for (a of dashActions; track a) {
                    <div class="mock-action-chip">{{ a }}</div>
                  }
                </div>
              </div>
            </div>
          </div>
        }

        @case ('alunos') {
          <div class="mock-shell mock-shell--topbar">
            <div class="mock-topbar">
              <div class="mock-topbar-title">Alunos</div>
              <div class="mock-btn-primary mock-btn-sm">+ Aluno</div>
            </div>
            <div class="mock-content mock-content--pad">
              <div class="mock-search-bar"></div>
              <div class="mock-table">
                <div class="mock-table-header">
                  <div class="mock-th">Nome</div><div class="mock-th">Status</div><div class="mock-th">Ações</div>
                </div>
                @for (row of alunosRows; track row.nome) {
                  <div class="mock-table-row">
                    <div class="mock-td mock-td--bold">{{ row.nome }}</div>
                    <div class="mock-td">
                      <span class="mock-badge" [class.mock-badge--ok]="row.ok">{{ row.status }}</span>
                    </div>
                    <div class="mock-td">
                      <span class="mock-btn-ghost mock-btn-xs">Ver</span>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        }

        @case ('cursos') {
          <div class="mock-shell mock-shell--topbar">
            <div class="mock-topbar">
              <div class="mock-topbar-title">Cursos</div>
              <div class="mock-btn-primary mock-btn-sm">+ Curso</div>
            </div>
            <div class="mock-content mock-content--pad">
              <div class="mock-course-grid">
                @for (c of cursosCards; track c.nome) {
                  <div class="mock-course-card">
                    <div class="mock-course-cover"></div>
                    <div class="mock-course-info">
                      <div class="mock-course-name">{{ c.nome }}</div>
                      <div class="mock-course-meta">{{ c.meta }}</div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        }

        @case ('aulas') {
          <div class="mock-shell mock-shell--topbar">
            <div class="mock-topbar">
              <div class="mock-topbar-title">Aulas</div>
            </div>
            <div class="mock-content mock-content--pad">
              <div class="mock-aulas-list">
                @for (a of aulasItems; track a.titulo) {
                  <div class="mock-aula-item">
                    <div class="mock-aula-thumb"></div>
                    <div class="mock-aula-info">
                      <div class="mock-aula-titulo">{{ a.titulo }}</div>
                      <div class="mock-aula-curso">{{ a.curso }}</div>
                    </div>
                    <span class="mock-badge" [class.mock-badge--ok]="a.pub">{{ a.status }}</span>
                  </div>
                }
              </div>
            </div>
          </div>
        }

        @case ('notas') {
          <div class="mock-shell mock-shell--topbar">
            <div class="mock-topbar">
              <div class="mock-topbar-title">Notas</div>
            </div>
            <div class="mock-content mock-content--pad">
              <div class="mock-notas-header">
                <div class="mock-select-bar"></div>
              </div>
              <div class="mock-table">
                <div class="mock-table-header">
                  <div class="mock-th">Aluno</div><div class="mock-th">Nota</div><div class="mock-th">Status</div>
                </div>
                @for (n of notasRows; track n.nome) {
                  <div class="mock-table-row">
                    <div class="mock-td mock-td--bold">{{ n.nome }}</div>
                    <div class="mock-td mock-td--primary">{{ n.nota }}</div>
                    <div class="mock-td">
                      <span class="mock-badge" [class.mock-badge--ok]="n.ok">{{ n.status }}</span>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        }

        @case ('perfil') {
          <div class="mock-shell mock-shell--topbar">
            <div class="mock-topbar">
              <div class="mock-topbar-title">Perfil</div>
            </div>
            <div class="mock-content mock-content--pad">
              <div class="mock-perfil-card">
                <div class="mock-avatar"></div>
                <div class="mock-perfil-info">
                  <div class="mock-perfil-nome">{{ nomeInstituicao }}</div>
                  <div class="mock-perfil-email">contato&#64;instituicao.edu</div>
                </div>
              </div>
              <div class="mock-form-fields">
                @for (f of perfilFields; track f) {
                  <div class="mock-form-row">
                    <div class="mock-form-label">{{ f }}</div>
                    <div class="mock-form-input"></div>
                  </div>
                }
              </div>
              <div class="mock-btn-primary mock-btn-save">Salvar alterações</div>
            </div>
          </div>
        }

      }
    </div>
  `,
  styleUrls: ['./page-preview.component.css'],
})
export class PagePreviewComponent implements OnChanges {
  @Input() page: PreviewPage = 'dashboard';
  @Input() theme: PreviewTheme = {};

  // ── Dashboard data ──────────────────────────────────────────────
  dashItems = [
    { label: 'Dashboard', active: true },
    { label: 'Alunos',    active: false },
    { label: 'Cursos',    active: false },
    { label: 'Notas',     active: false },
  ];
  dashStats   = [
    { value: '12',  label: 'Alunos'    },
    { value: '4',   label: 'Cursos'    },
    { value: '3',   label: 'Pendentes' },
  ];
  dashActions = ['Meu Perfil', 'Alunos', 'Cursos'];

  // ── Alunos data ─────────────────────────────────────────────────
  alunosRows = [
    { nome: 'Ana Silva',    status: 'Ativo',    ok: true  },
    { nome: 'Bruno Costa',  status: 'Pendente', ok: false },
    { nome: 'Carla Dias',   status: 'Ativo',    ok: true  },
  ];

  // ── Cursos data ─────────────────────────────────────────────────
  cursosCards = [
    { nome: 'Matemática', meta: '45 alunos · 12 aulas' },
    { nome: 'Português',  meta: '32 alunos · 8 aulas'  },
    { nome: 'Biologia',   meta: '28 alunos · 10 aulas' },
  ];

  // ── Aulas data ──────────────────────────────────────────────────
  aulasItems = [
    { titulo: 'Aula 01 — Intro',     curso: 'Matemática', status: 'Publicado', pub: true  },
    { titulo: 'Aula 02 — Funções',   curso: 'Matemática', status: 'Rascunho',  pub: false },
    { titulo: 'Aula 01 — Gramática', curso: 'Português',  status: 'Publicado', pub: true  },
  ];

  // ── Notas data ──────────────────────────────────────────────────
  notasRows = [
    { nome: 'Ana Silva',   nota: '9.5', status: 'Aprovado',  ok: true  },
    { nome: 'Bruno Costa', nota: '4.0', status: 'Reprovado', ok: false },
    { nome: 'Carla Dias',  nota: '7.8', status: 'Aprovado',  ok: true  },
  ];

  // ── Perfil data ─────────────────────────────────────────────────
  perfilFields = ['Nome', 'E-mail', 'CNPJ', 'Telefone'];

  get nomeInstituicao(): string { return this.theme?.nome ?? 'Minha Instituição'; }

  /** CSS vars aplicadas inline no wrapper — isolam o preview do tema global */
  get cssVars(): Record<string, string> {
    const overrides: Record<string, string> = {};
    const t = this.theme;

    if (t.primary_color)    overrides['--preview-primary']    = t.primary_color;
    if (t.secondary_color)  overrides['--preview-secondary']  = t.secondary_color;
    if (t.background_color) overrides['--preview-bg']         = t.background_color;
    if (t.border_radius)    overrides['--preview-radius']     = t.border_radius;
    if (t.font_family)      overrides['--preview-font']       = t.font_family;

    // Spacing
    const su = PREVIEW_SPACING[t.spacing ?? 'comfortable'] ?? '1rem';
    overrides['--preview-space'] = su;

    return overrides;
  }

  ngOnChanges(_changes: SimpleChanges): void {
    // Nada extra — cssVars é um getter que re-computa automaticamente
  }
}
