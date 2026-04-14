import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map, distinctUntilChanged } from 'rxjs/operators';

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
  gradient_enabled?: boolean;
  page_overrides?: {
    dashboard?: PageOverride;
    alunos?:    PageOverride;
    cursos?:    PageOverride;
    aulas?:     PageOverride;
    notas?:     PageOverride;
    perfil?:    PageOverride;
  } | null;
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
  gradient_enabled:      false,
};

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
const API              = 'http://localhost:8000/api';

@Injectable({ providedIn: 'root' })
export class ThemeService {

  // ─── Streams públicos ──────────────────────────────────────────────────────

  readonly logoUrl$  = new BehaviorSubject<string | null>(null);
  readonly darkMode$ = new BehaviorSubject<boolean>(false);

  /** Armazena o tema global (sem override de página) para uso em applyForPage() */
  private _baseTheme: Partial<Theme> = DEFAULT_THEME;

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

  constructor(private http: HttpClient) {}

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

  private _applyTokens(theme: Partial<Theme>): void {
    const root = document.documentElement;
    const body = document.body;

    // ── 1. Resolver modo escuro ───────────────────────────────
    // Prioridade: campo do objeto > localStorage > false
    const isDark = theme.dark_mode !== undefined
      ? theme.dark_mode
      : localStorage.getItem(STORAGE_KEY_DARK) === 'true';

    // ── 2. Resolver paleta (light / dark) ────────────────────
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
    const layout = theme.layout_type ?? DEFAULT_THEME.layout_type;
    body.setAttribute('data-layout', layout);

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
    });

    // ── 13. Persistir no localStorage ────────────────────────
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      primary_color: lightP,  secondary_color: lightS,  background_color: lightBg,
      dark_primary_color: darkP, dark_secondary_color: darkS, dark_background_color: darkBg,
      font_family: ff, dark_mode: isDark,
      logo_url: theme.logo_url ?? null, favicon_url: theme.favicon_url ?? null,
      nome: theme.nome ?? null,
      border_radius: br, spacing: sp, shadow_level: shadow,
      button_style: btnStyle, gradient_enabled: grad, layout_type: layout,
      page_overrides: this._baseTheme.page_overrides ?? null,
    }));
  }

  /**
   * Alterna dark mode reaplica o tema completo para que --primary etc.
   * reflitam as cores escuras corretamente.
   */
  toggleDarkMode(): void {
    const next = !this.darkMode$.value;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const stored: Partial<Theme> = raw ? JSON.parse(raw) : DEFAULT_THEME;
      this.applyTheme({ ...stored, dark_mode: next });
    } catch {
      this._applyDarkMode(next);
      localStorage.setItem(STORAGE_KEY_DARK, String(next));
    }
  }

  // ─── Carregar do backend ───────────────────────────────────────────────────

  carregarEAplicar(token: string): Observable<Theme | null> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<Theme>(`${API}/faculdades/minha/tema`, { headers }).pipe(
      tap(t => this.applyTheme(t)),
      catchError(() => { this.applyTheme(DEFAULT_THEME); return of(null); }),
    );
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
    return this.http.get<Theme>(`${API}/faculdades/publica/tema?slug=${encodeURIComponent(slug)}`).pipe(
      tap(t => this.applyTheme(t)),
      catchError(() => { this.applyTheme(DEFAULT_THEME); return of(null); }),
    );
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
