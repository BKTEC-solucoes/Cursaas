import { Component, Input, computed, signal, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Ícones minimalistas de traço — substituem os emojis que a UI usava.
 *
 * Por que não emoji: o glifo muda de desenho a cada sistema operacional
 * (e alguns nem existem em versões antigas), não herda a cor do tema, não
 * escala com o token de tipografia e chega ao leitor de tela como texto
 * ("bandeira do Japão", "polegar para cima") no meio da frase.
 *
 * Aqui todo ícone é um SVG de 24×24, traço 1.5, `stroke: currentColor` —
 * então herda a cor de onde estiver (botão, sidebar, badge de estado) e
 * acompanha o modo claro/escuro sem nenhuma regra extra.
 *
 * Uso:
 *   <app-icon name="check" />                    <!-- 16px, decorativo -->
 *   <app-icon name="trash" [size]="18" />
 *   <app-icon name="alert-triangle" label="Atenção" />   <!-- com rótulo a11y -->
 *
 * Sem `label` o ícone é `aria-hidden` — o correto quando o texto ao lado já
 * diz o que ele significa. Com `label` vira `role="img"` e é anunciado.
 */

/** Corpo de cada ícone: conteúdo interno do <svg viewBox="0 0 24 24">. */
const ICONES: Record<string, string> = {
  // ── Ações ────────────────────────────────────────────────────────────────
  'x':             '<path d="M18 6 6 18M6 6l12 12"/>',
  'check':         '<path d="m20 6-11 11-5-5"/>',
  'plus':          '<path d="M12 5v14M5 12h14"/>',
  'minus':         '<path d="M5 12h14"/>',
  'pencil':        '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  'trash':         '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6"/><path d="M10 11v6M14 11v6"/>',
  'search':        '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  'download':      '<path d="M21 15v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
  'upload':        '<path d="M21 15v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
  'link':          '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',

  // ── Direção ──────────────────────────────────────────────────────────────
  'chevron-down':  '<path d="m6 9 6 6 6-6"/>',
  'chevron-up':    '<path d="m18 15-6-6-6 6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'chevron-left':  '<path d="m15 18-6-6 6-6"/>',
  'play':          '<path d="M6 4.5v15l12-7.5Z"/>',
  'menu':          '<path d="M3 6h18M3 12h18M3 18h18"/>',
  'list':          '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',

  // ── Estado ───────────────────────────────────────────────────────────────
  'check-circle':  '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  'x-circle':      '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
  'alert-triangle':'<path d="M10.3 4.3 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  'info':          '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  'clock':         '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  'circle-dot':    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none"/>',
  'star':          '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z"/>',

  // ── Domínio ──────────────────────────────────────────────────────────────
  'grid':          '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  'file-text':     '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Z"/><path d="M14 3v5h5"/><path d="M8 13h8M8 17h5"/>',
  'file-plus':     '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8Z"/><path d="M14 3v5h5"/><path d="M12 12v6M9 15h6"/>',
  'calendar':      '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  'shield':        '<path d="M12 3l7 3v5.5c0 4.4-2.9 8.2-7 9.5-4.1-1.3-7-5.1-7-9.5V6l7-3Z"/>',
  'shield-check':  '<path d="M12 3l7 3v5.5c0 4.4-2.9 8.2-7 9.5-4.1-1.3-7-5.1-7-9.5V6l7-3Z"/><path d="m9 12 2 2 4-4"/>',
  'palette':       '<path d="M12 3a9 9 0 0 0 0 18c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1a1.6 1.6 0 0 1 1.2-2.7h1.9A5.6 5.6 0 0 0 22 10c0-3.9-4.5-7-10-7Z"/><circle cx="8.5" cy="8.5" r="1" fill="currentColor" stroke="none"/><circle cx="13" cy="6.5" r="1" fill="currentColor" stroke="none"/><circle cx="6.5" cy="13" r="1" fill="currentColor" stroke="none"/><circle cx="17" cy="10" r="1" fill="currentColor" stroke="none"/>',
  'graduation-cap':'<path d="M12 4 2 9l10 5 10-5-10-5Z"/><path d="M6 11.5V16c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4.5"/>',
  'book':          '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5.5a1.5 1.5 0 0 0 0 3H20"/><path d="M8 7h8"/>',
  'clipboard':     '<path d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1Z"/><path d="M16 5h2a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2"/><path d="M9 11h6M9 15h4"/>',
  'chart':         '<path d="M3 3v17a1 1 0 0 0 1 1h17"/><path d="M7 15v3M12 10v8M17 6v12"/>',
  'trending-up':   '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  'trending-down': '<path d="m3 7 6 6 4-4 8 8"/><path d="M15 17h6v-6"/>',
  'film':          '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 12h18M3 8h4M3 16h4M17 8h4M17 16h4"/>',
  'video':         '<rect x="3" y="6" width="12" height="12" rx="2"/><path d="m15 10 6-3v10l-6-3Z"/>',
  'monitor':       '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  'folder':        '<path d="M3 7a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/>',
  'inbox':         '<path d="M3 12h5l2 3h4l2-3h5"/><path d="M5.5 5h13l2.5 7v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6Z"/>',
  'package':       '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/>',
  'users':         '<path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 20v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1A4 4 0 0 1 16 11"/>',
  'building':      '<path d="M4 21V6l8-3 8 3v15"/><path d="M2 21h20"/><path d="M8 21v-4h8v4"/><path d="M8 9h.01M12 9h.01M16 9h.01M8 13h.01M12 13h.01M16 13h.01"/>',
  'home':          '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-7h6v7"/>',
  'globe':         '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z"/>',
  'settings':      '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>',
  'wrench':        '<path d="M14.7 6.3a4 4 0 0 0 5 5l-9.4 9.4a2.1 2.1 0 0 1-3-3Z"/><path d="m17 3 4 4"/>',
  'smartphone':    '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
  'mail':          '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/>',
  'target':        '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
  'zap':           '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  'rocket':        '<path d="M5 13c-1.5 1.5-2 5.5-2 5.5s4-.5 5.5-2A2.8 2.8 0 0 0 5 13Z"/><path d="M14.5 15 9 9.5c1-3.5 3.5-7 9-7.5.5 5.5-3 8-6.5 9Z"/><path d="M9.5 9.5 6 10l-2-2 3.5-1.5M14.5 15 14 18.5l2 2 1.5-3.5"/>',
  'plug':          '<path d="M9 2v6M15 2v6"/><path d="M6 8h12v3a6 6 0 0 1-12 0Z"/><path d="M12 17v5"/>',
  'flask':         '<path d="M10 3h4M11 3v6L5 19a1 1 0 0 0 .9 1.5h12.2A1 1 0 0 0 19 19l-6-10V3"/><path d="M7.5 15h9"/>',
  'bug':           '<rect x="8" y="7" width="8" height="13" rx="4"/><path d="M8 12H4M20 12h-4M8.5 8 6 5.5M15.5 8 18 5.5M8.5 17 6 19.5M15.5 17 18 19.5"/>',
  'thumbs-up':     '<path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z"/><path d="M7 10 12 3a2.5 2.5 0 0 1 2.5 3L14 10h5.5a2 2 0 0 1 2 2.4l-1.4 6.6a2 2 0 0 1-2 1.6H7"/>',

  // ── Tema ─────────────────────────────────────────────────────────────────
  'moon':          '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>',
  'sun':           '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  'contrast':      '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none"/>',
};

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
      [style.width.px]="size"
      [style.height.px]="size"
      [attr.role]="label ? 'img' : null"
      [attr.aria-label]="label || null"
      [attr.aria-hidden]="label ? null : 'true'"
      [innerHTML]="corpo()"
    ></svg>
  `,
  styles: [`
    :host { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; line-height: 0; }
    svg { display: block; }
  `],
})
export class IconComponent {
  /** Nome do ícone. Desconhecido → nada é renderizado (falha silenciosa). */
  @Input() set name(v: string) { this._name.set(v); }
  /** Lado do quadrado em px. */
  @Input() size = 16;
  /** Espessura do traço. */
  @Input() strokeWidth = 1.5;
  /** Se preenchido, o ícone é anunciado por leitores de tela com este texto. */
  @Input() label?: string;

  private readonly _name = signal('');
  private readonly sanitizer = inject(DomSanitizer);

  /**
   * `bypassSecurityTrustHtml` é necessário e seguro aqui.
   *
   * Necessário porque o sanitizador de HTML do Angular não tem `path`,
   * `circle` nem `rect` na allowlist de elementos — sem o bypass ele apagaria
   * o corpo inteiro do ícone e o `<svg>` renderizaria vazio.
   *
   * Seguro porque a string vem exclusivamente do mapa ICONES, definido acima
   * neste arquivo: é constante de build, nunca vem de input do usuário, de
   * rota nem de resposta da API. Um nome desconhecido resolve para '' —
   * jamais para conteúdo arbitrário.
   */
  readonly corpo = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(ICONES[this._name()] ?? ''),
  );
}

/** Nomes de ícone disponíveis no mapa. */
export const ICON_NAMES = Object.keys(ICONES);
