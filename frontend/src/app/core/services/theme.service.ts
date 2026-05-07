import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map, distinctUntilChanged, finalize, shareReplay } from 'rxjs/operators';
import { generatePalette, applyPaletteToRoot, applyDarkOverrideToRoot } from './color-palette';

export interface PageOverride {
  primary_color?: string;
  secondary_color?: string;
  background_color?: string;
  border_radius?: string;
  button_style?: 'rounded' | 'square' | 'pill';
  shadow_level?: 'none' | 'soft' | 'strong';
  gradient_enabled?: boolean;
}

export interface Theme {
  faculdade_id?: number;
  nome?: string;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  background_color?: string | null;
  font_family?: string | null;
  dark_mode?: boolean;
  dark_primary_color?: string | null;
  dark_secondary_color?: string | null;
  dark_background_color?: string | null;
  favicon_url?: string | null;
  // Tokens avançados
  border_radius?: string | null;
  spacing?: 'compact' | 'comfortable' | 'spacious' | null;
  shadow_level?: 'none' | 'soft' | 'strong' | null;
  button_style?: 'rounded' | 'square' | 'pill' | null;
  layout_type?: 'topbar' | 'sidebar' | null;
  content_width?:       'full' | 'boxed' | null;
  sidebar_collapsible?: boolean | null;
  anim_intensity?:      'none' | 'reduced' | 'normal' | 'expressive' | null;
  transition_type?:     'instant' | 'fade' | 'slide' | 'spring' | null;
  gradient_enabled?: boolean;
  page_overrides?: {
    dashboard?: PageOverride;
    alunos?:    PageOverride;
    cursos?:    PageOverride;
    aulas?:     PageOverride;
    notas?:     PageOverride;
    perfil?:    PageOverride;
  } | null;
  // Tela de login
  login_layout?:           'centered' | 'split-left' | 'split-right' | null;
  login_background_type?:  'gradient' | 'color' | 'image' | null;
  login_background_value?: string | null;
  login_message_title?:    string | null;
  login_message_body?:     string | null;
}

export interface ThemePreset {
  id: number;
  nome: string;
  preview_color: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  font_family: string;
  dark_primary_color: string;
  dark_secondary_color: string;
  dark_background_color: string;
}

export interface ThemeListItem {
  id: number;
  nome: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  dark_mode: boolean;
  favicon_url: string | null;
  border_radius: string;
  spacing: 'compact' | 'comfortable' | 'spacious';
  button_style: 'rounded' | 'square' | 'pill';
  shadow_level: 'none' | 'soft' | 'strong';
  layout_type: 'topbar' | 'sidebar';
  gradient_enabled: boolean;
  ativo: boolean;
  criado_em: string;
}

/** Preferência explícita do usuário para o modo de cor. */
export type DarkPref = 'light' | 'dark' | 'system';

const DEFAULT_THEME = {
  primary_color:         '#1a6b3c',
  secondary_color:       '#0f4b2a',
  background_color:      '#f0fdf4',
  font_family:           'Inter, system-ui, sans-serif',
  dark_primary_color:    '#34d399',
  dark_secondary_color:  '#10b981',
  dark_background_color: '#0f172a',
  border_radius:         '8px',
  spacing:               'comfortable' as const,
  shadow_level:          'soft'        as const,
  button_style:          'rounded'     as const,
  layout_type:           'topbar'      as const,
  content_width:         'boxed'       as const,
  sidebar_collapsible:   true,
  anim_intensity:        'normal'      as const,
  transition_type:       'fade'        as const,
  gradient_enabled:      false,
};

/**
 * Limites canônicos do sistema de temas.
 * Compartilhado pelo ThemeService._sanitize() e pelos formulários de admin.
 * O backend replica estas regras nos validadores Pydantic.
 */
export const THEME_LIMITS = {
  /** border_radius: max 32px para valores `px`. Pill é via button_style='pill'. */
  borderRadius:      { minPx: 0, maxPx: 32 },
  /** Formato hex aceito: #RGB ou #RRGGBB. */
  colorFormat:       /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
  /** Contraste mínimo primary × background (WCAG 2.1 relativo). */
  minColorContrast:  1.2,
  fontFamily: {
    maxLength:  150,
    /** Qualquer match neste regex é recusado (injeção CSS). */
    forbidden:  /[;{}@<>\\]/,
  },
  /** Campos que page_overrides pode alterar por página. */
  allowedPageOverrideFields: [
    'primary_color', 'secondary_color', 'background_color',
    'border_radius', 'button_style', 'shadow_level', 'gradient_enabled',
  ] as const,
  /**
   * Tokens CSS gerenciados EXCLUSIVAMENTE pelo ThemeService via setProperty().
   * Não sobrescreva via :root{} em CSS customizado — o ThemeService irá vencer.
   */
  managedTokens: [
    '--primary', '--secondary', '--background', '--font-family',
    '--radius', '--space-unit',
  ] as const,
  /**
   * Tokens estruturais imutáveis — o ThemeService jamais os sobrescreve.
   * Instâncias de admin não devem permitir alteração direct desses valores.
   */
  frozenTokens: [
    // Escala tipográfica — fixada no design system
    '--font-size-xs', '--font-size-sm', '--font-size-md',
    '--font-size-lg', '--font-size-xl', '--font-size-2xl', '--font-size-3xl',
    // Empilhamento — a quebra de hierarquia cria bugs de modal/overlay
    '--z-dropdown', '--z-sticky', '--z-overlay', '--z-modal', '--z-toast',
  ] as const,
} as const;

/** Mapa spacing → --space-unit em rem */
const SPACING_UNIT: Record<string, string> = {
  compact:      '0.75rem',
  comfortable:  '1rem',
  spacious:     '1.25rem',
};

/** Mapa shadow_level → atributo data-shadow no <body> */
const SHADOW_ATTR = 'data-shadow';
const BUTTON_ATTR = 'data-button-style';
const GRADIENT_ATTR = 'data-gradient';

const STORAGE_KEY      = 'tenant_theme';
const STORAGE_KEY_DARK = 'tenant_dark_mode';
const STORAGE_KEY_PREF = 'user_dark_pref';   // 'light' | 'dark' | 'system'
const API              = 'http://localhost:8000/api';
/** Tempo máximo antes de revalidar o tema com o backend (1 hora) */
const CACHE_TTL_MS         = 60 * 60 * 1000;
/**
 * Janela de frescor em memória: se já houve uma busca bem-sucedida
 * nos últimos 30s, carregarSeNecessario reutiliza o tema em memória.
 * Evita a dupla requisição entre APP_INITIALIZER Stage 2 e themeResolver
 * que disparam quase simultaneamente no carregamento inicial da SPA.
 */
const FETCH_FRESH_WINDOW_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class ThemeService {

  // ─── Streams públicos ──────────────────────────────────────────────────────

  readonly logoUrl$       = new BehaviorSubject<string | null>(null);
  readonly darkMode$      = new BehaviorSubject<boolean>(false);
  /** Emite a preferência de modo escuro do usuário: 'light' | 'dark' | 'system'. */
  readonly darkModePref$  = new BehaviorSubject<DarkPref>('system');

  // ─── Media query para prefers-color-scheme ────────────────────────────────
  private readonly _mq: MediaQueryList | null =
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  private _mqListener: (() => void) | null = null;

  /** Armazena o tema global (sem override de página) para uso em applyForPage() */
  private _baseTheme: Partial<Theme> = DEFAULT_THEME;

  // ─── Estado interno de performance ────────────────────────────────────────

  /** Timestamp (ms) da última busca bem-sucedida no backend; reset no reload da aba */
  private _lastFetchMs = 0;
  /** Observable em andamento de carregarEAplicar — deduplicação de requisições simultâneas */
  private _inFlight$: Observable<Theme | null> | null = null;
  /** Hash do últmo conjunto de tokens aplicado ao DOM — evita writes idênticos */
  private _lastAppliedHash = '';

  /**
   * Emite o objeto de tema completo sempre que `applyTheme()` é chamado.
   * Use para que componentes reajam a mudanças sem re-render completo.
   */
  private readonly _currentTheme$ = new BehaviorSubject<Partial<Theme>>(DEFAULT_THEME);
  readonly currentTheme$ = this._currentTheme$.asObservable();

  /**
   * Emite 'topbar' | 'sidebar' quando o layout muda.
   * Ex.: `(themeService.layoutType$ | async) === 'sidebar'`
   */
  readonly layoutType$: Observable<'topbar' | 'sidebar'> = this._currentTheme$.pipe(
    map(t => t.layout_type ?? 'topbar'),
    distinctUntilChanged(),
  );

  readonly contentWidth$: Observable<'full' | 'boxed'> = this._currentTheme$.pipe(
    map(t => t.content_width ?? 'boxed'),
    distinctUntilChanged(),
  );

  readonly sidebarCollapsible$: Observable<boolean> = this._currentTheme$.pipe(
    map(t => t.sidebar_collapsible ?? true),
    distinctUntilChanged(),
  );

  readonly animIntensity$: Observable<'none' | 'reduced' | 'normal' | 'expressive'> =
    this._currentTheme$.pipe(
      map(t => t.anim_intensity ?? 'normal'),
      distinctUntilChanged(),
    );

  readonly transitionType$: Observable<'instant' | 'fade' | 'slide' | 'spring'> =
    this._currentTheme$.pipe(
      map(t => t.transition_type ?? 'fade'),
      distinctUntilChanged(),
    );

  constructor(private http: HttpClient) {
    // Restaura preferência persistida (ou faz migração do boolean legado)
    const storedPref = localStorage.getItem(STORAGE_KEY_PREF) as DarkPref | null;
    if (storedPref && (['light', 'dark', 'system'] as string[]).includes(storedPref)) {
      this.darkModePref$.next(storedPref);
    } else {
      const legacy = localStorage.getItem(STORAGE_KEY_DARK);
      if (legacy === 'true')        this.darkModePref$.next('dark');
      else if (legacy === 'false')  this.darkModePref$.next('light');
      // undefined → mantém 'system' como padrão
    }
    // Instala listener do SO se a preferência for 'system'
    if (this.darkModePref$.value === 'system') this._installSystemListener();
  }

  // ─── Aplicar tema completo ─────────────────────────────────────────────────

  applyTheme(theme: Partial<Theme>): void {
    // Salva o tema global (exclui page_overrides do _baseTheme via desestruturação)
    const { page_overrides, ...rest } = theme;
    this._baseTheme = { ...DEFAULT_THEME, ...rest, page_overrides };
    this._applyTokens(theme);
  }

  /**
   * Aplica o tema global + override da página informada (se existir).
   * Chamado pelo layout ao detectar mudança de rota.
   */
  applyForPage(pageName: string): void {
    const overrides = this._baseTheme.page_overrides?.[pageName as keyof NonNullable<Theme['page_overrides']>];
    const merged = overrides && Object.keys(overrides).length > 0
      ? { ...this._baseTheme, ...overrides }
      : this._baseTheme;
    this._applyTokens(merged);
  }

  /**
   * Sanitiza valores antes de aplicar ao DOM — última linha de defesa client-side.
   * Operações: remoção de injeção CSS em font_family, clamp de border_radius e
   * normalização de contradições de animação.
   */
  private _sanitize(theme: Partial<Theme>): Partial<Theme> {
    const t = { ...theme };

    // font_family: strip de chars de injeção CSS
    if (t.font_family) {
      const clean = t.font_family
        .replace(THEME_LIMITS.fontFamily.forbidden, '')
        .trim()
        .slice(0, THEME_LIMITS.fontFamily.maxLength);
      t.font_family = clean || DEFAULT_THEME.font_family;
    }

    // border_radius: clamp de valores px; rem/em/% passam direto
    if (t.border_radius) {
      const m = t.border_radius.match(/^(\d+(?:\.\d+)?)px$/);
      if (m && parseFloat(m[1]) > THEME_LIMITS.borderRadius.maxPx) {
        t.border_radius = `${THEME_LIMITS.borderRadius.maxPx}px`;
      }
    }

    // anim_intensity=none → transition_type=instant (sem contradição entre campos)
    if (t.anim_intensity === 'none') {
      t.transition_type = 'instant';
    }

    return t;
  }

  private _applyTokens(theme: Partial<Theme>): void {
    // Dirty-check: evita 20+ setProperty calls quando o tema composto não mudou
    // (ex.: resolver e APP_INITIALIZER resolvem para o mesmo objeto do backend)
    const hash = JSON.stringify(theme);
    if (hash === this._lastAppliedHash) return;
    this._lastAppliedHash = hash;
    // Última linha de defesa: sanitiza antes de gravar no DOM
    theme = this._sanitize(theme);

    const root = document.documentElement;
    const body = document.body;

    // ── 1. Resolver modo escuro ───────────────────────────────
    // Prioridade: preferência explícita do usuário > OS (se 'system') > campo do tema
    const isDark = this._resolveDark(theme.dark_mode);

    // ── 2. Gerar paleta via OKLCH a partir do primary_color ──
    // Aplica a escala brand-50…brand-950 e todos os tokens semânticos
    // derivados (hover, active, disabled, nav-indicator, focus-ring, etc.)
    // ANTES de aplicar os valores concretos de --primary / --secondary.
    const rawPrimary = theme.primary_color ?? DEFAULT_THEME.primary_color;
    try {
      const palette = generatePalette(rawPrimary);
      applyPaletteToRoot(root, palette);
    } catch {
      // Hex inválido — ignora silenciosamente e prossegue com os valores brutos
    }
    // Dark primary override: regenera tokens dark a partir do dark_primary_color
    // explícito (que pode ter hue diferente do primary claro).
    try {
      applyDarkOverrideToRoot(
        root,
        generatePalette(theme.dark_primary_color ?? DEFAULT_THEME.dark_primary_color),
      );
    } catch { /* hex inválido */ }

    // ── 3. Resolver paleta (light / dark) ────────────────────
    const lightP  = theme.primary_color         ?? DEFAULT_THEME.primary_color;
    const lightS  = theme.secondary_color       ?? DEFAULT_THEME.secondary_color;
    const lightBg = theme.background_color      ?? DEFAULT_THEME.background_color;
    const darkP   = theme.dark_primary_color    ?? DEFAULT_THEME.dark_primary_color;
    const darkS   = theme.dark_secondary_color  ?? DEFAULT_THEME.dark_secondary_color;
    const darkBg  = theme.dark_background_color ?? DEFAULT_THEME.dark_background_color;
    const ff      = theme.font_family           ?? DEFAULT_THEME.font_family;

    // --primary sempre reflete o modo atual (light ou dark)
    const p  = isDark ? darkP  : lightP;
    const s  = isDark ? darkS  : lightS;
    const bg = isDark ? darkBg : lightBg;

    root.style.setProperty('--primary',          p);
    root.style.setProperty('--primary-color',    p);   // alias legado
    root.style.setProperty('--secondary',        s);
    root.style.setProperty('--secondary-color',  s);   // alias legado
    root.style.setProperty('--background',       bg);
    root.style.setProperty('--background-color', bg);  // alias legado
    root.style.setProperty('--font-family',      ff);

    // ── data-app-theme: deriva "verde" | "azul" a partir do primary_color ────
    // Converte o hex para HSL e classifica pelo ângulo de hue:
    //   Verde: 80°–180°  |  Azul: 180°–270°  |  Demais → fallback "verde"
    try {
      const hex = lightP.replace('#', '');
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0;
      if (max !== min) {
        const d = max - min;
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        else if (max === g) h = ((b - r) / d + 2) * 60;
        else h = ((r - g) / d + 4) * 60;
      }
      const appTheme = (h >= 180 && h < 270) ? 'azul' : 'verde';
      root.setAttribute('data-app-theme', appTheme);
    } catch {
      root.setAttribute('data-app-theme', 'verde');
    }

    // Preserva as variantes para que CSS puro possa trocar via [data-theme]
    root.style.setProperty('--light-primary',         lightP);
    root.style.setProperty('--light-secondary',       lightS);
    root.style.setProperty('--light-background',      lightBg);
    root.style.setProperty('--dark-primary-color',    darkP);
    root.style.setProperty('--dark-secondary-color',  darkS);
    root.style.setProperty('--dark-background-color', darkBg);

    // ── 3. Border radius ─────────────────────────────────────
    const br = theme.border_radius ?? DEFAULT_THEME.border_radius;
    root.style.setProperty('--radius', br);

    // ── 4. Espaçamento ───────────────────────────────────────
    const sp = theme.spacing ?? DEFAULT_THEME.spacing;
    root.style.setProperty('--space-unit', SPACING_UNIT[sp] ?? SPACING_UNIT['comfortable']);
    // data-density dispara os overrides de [data-density] no CSS
    body.setAttribute('data-density', sp);

    // ── 5. Nível de sombra (data-shadow no <body>) ───────────
    const shadow = theme.shadow_level ?? DEFAULT_THEME.shadow_level;
    body.setAttribute(SHADOW_ATTR, shadow);

    // ── 6. Estilo de botão (data-button-style no <body>) ─────
    const btnStyle = theme.button_style ?? DEFAULT_THEME.button_style;
    body.setAttribute(BUTTON_ATTR, btnStyle);

    // ── 7. Gradiente (data-gradient no <body>) ───────────────
    const grad = theme.gradient_enabled ?? DEFAULT_THEME.gradient_enabled;
    body.setAttribute(GRADIENT_ATTR, String(grad));

    // ── 8. Layout (data-layout no <body>) ────────────────────
    const layout = theme.layout_type   ?? DEFAULT_THEME.layout_type;
    const cw     = theme.content_width ?? DEFAULT_THEME.content_width;
    const scoll  = theme.sidebar_collapsible ?? DEFAULT_THEME.sidebar_collapsible;
    const anim   = theme.anim_intensity  ?? DEFAULT_THEME.anim_intensity;
    const trans  = theme.transition_type ?? DEFAULT_THEME.transition_type;
    body.setAttribute('data-layout',              layout);
    body.setAttribute('data-content-width',       cw);
    body.setAttribute('data-sidebar-collapsible', String(scoll));
    body.setAttribute('data-anim',                anim);
    body.setAttribute('data-transition',          trans);

    // ── 9. Dark mode: atributo HTML + stream ─────────────────
    this._applyDarkMode(isDark);
    localStorage.setItem(STORAGE_KEY_DARK, String(isDark));

    // ── 10. Favicon ──────────────────────────────────────────
    if (theme.favicon_url) {
      this._applyFavicon(theme.favicon_url);
    } else {
      this._generateFaviconFromColor(p, theme.nome ?? 'C');
    }

    // ── 11. Logo ─────────────────────────────────────────────
    this.logoUrl$.next(theme.logo_url ?? null);

    // ── 12. Emitir tema atual ─────────────────────────────────
    this._currentTheme$.next({
      ...DEFAULT_THEME, ...theme,
      // normaliza para refletir os valores efetivos
      primary_color: lightP, secondary_color: lightS, background_color: lightBg,
      dark_mode: isDark, border_radius: br, spacing: sp,
      shadow_level: shadow, button_style: btnStyle,
      gradient_enabled: grad, layout_type: layout,
      content_width: cw, sidebar_collapsible: scoll,
      anim_intensity: anim, transition_type: trans,
    });

    // ── 13. Persistir no localStorage (com timestamp para TTL) ───
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      primary_color: lightP,  secondary_color: lightS,  background_color: lightBg,
      dark_primary_color: darkP, dark_secondary_color: darkS, dark_background_color: darkBg,
      font_family: ff, dark_mode: isDark,
      logo_url: theme.logo_url ?? null, favicon_url: theme.favicon_url ?? null,
      nome: theme.nome ?? null,
      border_radius: br, spacing: sp, shadow_level: shadow,
      button_style: btnStyle, gradient_enabled: grad, layout_type: layout,
      content_width: cw, sidebar_collapsible: scoll,
      anim_intensity: anim, transition_type: trans,
      page_overrides: this._baseTheme.page_overrides ?? null,
      _ts: Date.now(),
    }));
  }

  /**
   * Alterna entre 'dark' e 'light'. Para o ciclo de 3 estados (incluindo
   * 'system'), use setDarkModePreference() diretamente.
   */
  toggleDarkMode(): void {
    this.setDarkModePreference(this.darkMode$.value ? 'light' : 'dark');
  }

  /**
   * Define a preferência de modo de cor do usuário:
   *  - 'dark':   sempre escuro, ignora tema e SO
   *  - 'light':  sempre claro, ignora tema e SO
   *  - 'system': segue prefers-color-scheme do sistema operacional
   *
   * Persiste a escolha em localStorage e reaaplica o tema imediatamente.
   */
  setDarkModePreference(pref: DarkPref): void {
    // Remove listener existente antes de instalar um novo
    if (this._mqListener) {
      this._mq?.removeEventListener('change', this._mqListener);
      this._mqListener = null;
    }
    this.darkModePref$.next(pref);
    localStorage.setItem(STORAGE_KEY_PREF, pref);
    this._lastAppliedHash = '';   // força re-apply mesmo que o tema não tenha mudado
    this.applyTheme(this._baseTheme);
    if (pref === 'system') this._installSystemListener();
  }

  // ─── Carregar do backend ───────────────────────────────────────────────────

  carregarEAplicar(token: string): Observable<Theme | null> {
    // ── Deduplicação in-flight ────────────────────────────────────────────────
    // Se já existe uma requisição em andamento (ex.: APP_INITIALIZER Stage 2 ainda
    // aguardando resposta quando o themeResolver dispara), os dois subscribers
    // recebem o mesmo resultado HTTP sem uma segunda chamada ao backend.
    if (this._inFlight$) return this._inFlight$;

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this._inFlight$ = this.http
      .get<Theme>(`${API}/faculdades/minha/tema`, { headers })
      .pipe(
        tap(t => { this.applyTheme(t); this._lastFetchMs = Date.now(); }),
        catchError(() => { this.applyTheme(DEFAULT_THEME); return of(null); }),
        // Libera o slot quando a requisição terminar (sucesso ou erro)
        finalize(() => { this._inFlight$ = null; }),
        // Permite múltiplos subscribers sem re-executar o HTTP
        shareReplay(1),
      );
    return this._inFlight$;
  }

  /**
   * TTL-aware wrapper de carregarEAplicar.
   *
   * Se já houve uma busca bem-sucedida nos últimos `windowMs` ms (padrão 30s),
   * retorna o tema atual em memória sem nova requisição HTTP.
   *
   * Cenário principal: APP_INITIALIZER Stage 2 dispara carregarEAplicar em
   * background no boot; quando o themeResolver executa ~300ms depois, a
   * resposta pode já ter chegado → `_lastFetchMs` recente → zero request extra.
   * Se ainda estiver em andamento → `_inFlight$` ativo → mesma requisição compartilhada.
   *
   * Use este método em: App_INITIALIZER Stage 2, themeResolver.
   * Use carregarEAplicar diretamente apenas quando forçar atualização (ex.: admin salva tema).
   */
  carregarSeNecessario(
    token: string,
    windowMs = FETCH_FRESH_WINDOW_MS,
  ): Observable<Theme | null> {
    if (Date.now() - this._lastFetchMs < windowMs) {
      // Tema recente: retorna o estado atual sem abrir conexão
      return of(this._currentTheme$.value as Theme | null);
    }
    return this.carregarEAplicar(token);
  }

  /** Reaplicar ao recarregar a página (chamado via APP_INITIALIZER em main.ts). */
  aplicarDoCache(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.applyTheme(JSON.parse(raw));
      else     this.applyTheme(DEFAULT_THEME);
    } catch {
      this.applyTheme(DEFAULT_THEME);
    }
  }

  aplicarPorSlug(slug: string): Observable<Theme | null> {
    return this.http.get<Theme>(`${API}/faculdades/publica/tema/${encodeURIComponent(slug)}`).pipe(
      tap(t => this.applyTheme(t)),
      catchError(() => { this.applyTheme(DEFAULT_THEME); return of(null); }),
    );
  }

  /**
   * Re-busca o tema do backend apenas se o cache estiver vencido (> CACHE_TTL_MS).
   * Chamado nos layouts após navegação para garantir que temas alterados pela
   * instituição sejam propagados sem exigir re-login.
   */
  recarregarSeVencido(token: string): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as Partial<Theme> & { _ts?: number };
        const age = Date.now() - (cached._ts ?? 0);
        if (age < CACHE_TTL_MS) return; // cache ainda válido
      }
    } catch { /* JSON inválido: segue para re-busca */ }
    this.carregarEAplicar(token).subscribe();
  }

  /** Persiste no banco e reaaplica localmente. */
  salvar(token: string, payload: Partial<Theme>): Observable<Theme> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.put<Theme>(`${API}/faculdades/minha/tema`, payload, { headers }).pipe(
      tap(t => this.applyTheme(t)),
    );
  }

  limpar(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY_DARK);
    this.applyTheme(DEFAULT_THEME);
  }

  // ─── Preset / Multi-tema API ───────────────────────────────────────────────

  listarPresets(): Observable<ThemePreset[]> {
    return this.http.get<ThemePreset[]>(`${API}/faculdades/presets`);
  }

  listarTemas(token: string): Observable<ThemeListItem[]> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<ThemeListItem[]>(`${API}/faculdades/minha/temas`, { headers });
  }

  ativarTema(token: string, id: number): Observable<Theme> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.post<Theme>(`${API}/faculdades/minha/temas/${id}/ativar`, {}, { headers }).pipe(
      tap(t => this.applyTheme(t)),
    );
  }

  // ─── Internos ──────────────────────────────────────────────────────────────

  /**
   * Resolve se o modo escuro deve estar ativo, respeitando a hierarquia:
   * preferência explícita do usuário > SO (quando 'system') > campo do tema.
   */
  private _resolveDark(themeField: boolean | undefined): boolean {
    const pref = this.darkModePref$.value;
    if (pref === 'dark')  return true;
    if (pref === 'light') return false;
    // 'system': delega ao SO; se indiponível, usa campo do tema ou false
    return this._mq?.matches ?? themeField ?? false;
  }

  /** Instala listener que reaplica o tema quando o SO muda de esquema de cor. */
  private _installSystemListener(): void {
    if (!this._mq) return;
    this._mqListener = () => {
      this._lastAppliedHash = '';
      this.applyTheme(this._baseTheme);
    };
    this._mq.addEventListener('change', this._mqListener);
  }

  private _applyDarkMode(isDark: boolean): void {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    this.darkMode$.next(isDark);
  }

  private _applyFavicon(url: string): void {
    let link = document.getElementById('app-favicon') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id   = 'app-favicon';
      link.rel  = 'icon';
      link.type = 'image/png';
      document.head.appendChild(link);
    }
    link.href = url;
  }

  private _generateFaviconFromColor(color: string, initial: string): void {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 32;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(0, 0, 32, 32, 6);
      ctx.fill();

      ctx.fillStyle    = '#ffffff';
      ctx.font         = 'bold 18px Inter, system-ui, sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initial.charAt(0).toUpperCase(), 16, 17);

      this._applyFavicon(canvas.toDataURL('image/png'));
    } catch { /* canvas não disponível (SSR, etc.) */ }
  }
}
