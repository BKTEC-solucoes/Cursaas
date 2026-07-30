# Bootstrap de path: este script vive em backend/tools/<categoria>/, mas
# importa `app.*`, que resolve a partir de backend/.
import pathlib as _pathlib
import sys as _sys
_sys.path.insert(0, str(_pathlib.Path(__file__).resolve().parents[2]))

"""Reescreve theme.service.ts e tema.component.ts sem duplicatas."""
import pathlib

BASE = pathlib.Path(r"C:\Users\Gabriel\Documents\GitHub\Cursaas\frontend\src\app")

# ─────────────────────────────────────────────────────────────────────────────
THEME_SERVICE = r'''import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

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
};

const STORAGE_KEY      = 'tenant_theme';
const STORAGE_KEY_DARK = 'tenant_dark_mode';
const API              = 'http://localhost:8000/api';

@Injectable({ providedIn: 'root' })
export class ThemeService {

  readonly logoUrl$  = new BehaviorSubject<string | null>(null);
  readonly darkMode$ = new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient) {}

  // ─── Aplicar tema completo ─────────────────────────────────────────────────

  applyTheme(theme: Partial<Theme>): void {
    const root = document.documentElement;

    const p  = theme.primary_color         ?? DEFAULT_THEME.primary_color;
    const s  = theme.secondary_color       ?? DEFAULT_THEME.secondary_color;
    const bg = theme.background_color      ?? DEFAULT_THEME.background_color;
    const ff = theme.font_family           ?? DEFAULT_THEME.font_family;
    const dp = theme.dark_primary_color    ?? DEFAULT_THEME.dark_primary_color;
    const ds = theme.dark_secondary_color  ?? DEFAULT_THEME.dark_secondary_color;
    const db = theme.dark_background_color ?? DEFAULT_THEME.dark_background_color;

    root.style.setProperty('--primary-color',         p);
    root.style.setProperty('--secondary-color',        s);
    root.style.setProperty('--background-color',       bg);
    root.style.setProperty('--font-family',            ff);
    root.style.setProperty('--dark-primary-color',    dp);
    root.style.setProperty('--dark-secondary-color',  ds);
    root.style.setProperty('--dark-background-color', db);

    if (theme.favicon_url) {
      this._applyFavicon(theme.favicon_url);
    } else {
      this._generateFaviconFromColor(p, theme.nome ?? 'C');
    }

    this.logoUrl$.next(theme.logo_url ?? null);

    const savedDark = localStorage.getItem(STORAGE_KEY_DARK) === 'true';
    this._applyDarkMode(savedDark);

    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      primary_color: p, secondary_color: s, background_color: bg,
      font_family: ff, dark_primary_color: dp, dark_secondary_color: ds,
      dark_background_color: db, logo_url: theme.logo_url ?? null,
      favicon_url: theme.favicon_url ?? null, nome: theme.nome ?? null,
    }));
  }

  toggleDarkMode(): void {
    const next = !this.darkMode$.value;
    this._applyDarkMode(next);
    localStorage.setItem(STORAGE_KEY_DARK, String(next));
  }

  // ─── Carregar do backend ───────────────────────────────────────────────────

  carregarEAplicar(token: string): Observable<Theme | null> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<Theme>(`${API}/faculdades/minha/tema`, { headers }).pipe(
      tap(t => this.applyTheme(t)),
      catchError(() => { this.applyTheme(DEFAULT_THEME); return of(null); }),
    );
  }

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
    return this.http.get<Theme>(`${API}/faculdades/publica/tema?slug=${slug}`).pipe(
      tap(t => this.applyTheme(t)),
      catchError(() => { this.applyTheme(DEFAULT_THEME); return of(null); }),
    );
  }

  salvar(token: string, payload: Partial<Theme>): Observable<Theme> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.put<Theme>(`${API}/instituicoes/minha/tema`, payload, { headers }).pipe(
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
'''

# ─────────────────────────────────────────────────────────────────────────────
TEMA_COMPONENT = r'''import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService, ThemePreset, ThemeListItem } from '../../../core/services/theme.service';

interface TemaValues {
  primary_color: string;
  secondary_color: string;
  background_color: string;
  font_family: string;
  dark_mode: boolean;
  dark_primary_color: string;
  dark_secondary_color: string;
  dark_background_color: string;
}

export const FONT_OPTIONS = [
  { label: 'Inter (padrão)',   value: 'Inter, system-ui, sans-serif' },
  { label: 'Roboto',           value: 'Roboto, sans-serif' },
  { label: 'Open Sans',        value: '"Open Sans", sans-serif' },
  { label: 'Poppins',          value: 'Poppins, sans-serif' },
  { label: 'Lato',             value: 'Lato, sans-serif' },
  { label: 'Montserrat',       value: 'Montserrat, sans-serif' },
  { label: 'Nunito',           value: 'Nunito, sans-serif' },
  { label: 'Source Sans Pro',  value: '"Source Sans Pro", sans-serif' },
];

const DEFAULT_VALUES: TemaValues = {
  primary_color:         '#1a6b3c',
  secondary_color:       '#0f4b2a',
  background_color:      '#f0fdf4',
  font_family:           'Inter, system-ui, sans-serif',
  dark_mode:             false,
  dark_primary_color:    '#34d399',
  dark_secondary_color:  '#10b981',
  dark_background_color: '#0f172a',
};

const API = 'http://localhost:8000/api';
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

@Component({
  selector: 'app-instituicao-tema',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './tema.component.html',
  styleUrls: ['./tema.component.css'],
})
export class InstituicaoTemaComponent implements OnInit, OnDestroy {
  @ViewChild('logoInput')    logoInputRef!:    ElementRef<HTMLInputElement>;
  @ViewChild('faviconInput') faviconInputRef!: ElementRef<HTMLInputElement>;

  form: FormGroup;
  previewLogo:    string | null = null;
  previewFavicon: string | null = null;
  fontOptions = FONT_OPTIONS;

  temas:   ThemeListItem[] = [];
  presets: ThemePreset[]   = [];
  showPresets = false;
  temaAtivoId: number | null = null;

  carregando = true;
  salvando   = false;
  sucesso    = false;
  erro       = '';

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private authService: AuthService,
    readonly themeService: ThemeService,
  ) {
    this.form = this.fb.nonNullable.group({
      primary_color:         [DEFAULT_VALUES.primary_color],
      secondary_color:       [DEFAULT_VALUES.secondary_color],
      background_color:      [DEFAULT_VALUES.background_color],
      font_family:           [DEFAULT_VALUES.font_family],
      dark_mode:             [DEFAULT_VALUES.dark_mode],
      dark_primary_color:    [DEFAULT_VALUES.dark_primary_color],
      dark_secondary_color:  [DEFAULT_VALUES.dark_secondary_color],
      dark_background_color: [DEFAULT_VALUES.dark_background_color],
    });
  }

  ngOnInit(): void {
    this.form.valueChanges.pipe(
      debounceTime(30),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      takeUntil(this.destroy$),
    ).subscribe(values => this.themeService.applyTheme(values));

    this.carregar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get v(): TemaValues { return this.form.getRawValue() as TemaValues; }

  get selectedFontLabel(): string {
    return this.fontOptions.find(f => f.value === this.v.font_family)?.label ?? this.v.font_family;
  }

  private get headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken() ?? ''}` });
  }

  // ─── Carregar ─────────────────────────────────────────────────────────────

  carregar(): void {
    this.carregando = true;
    forkJoin({
      tema:    this.http.get<any>(`${API}/instituicoes/minha/tema`, { headers: this.headers }),
      temas:   this.http.get<ThemeListItem[]>(`${API}/faculdades/minha/temas`, { headers: this.headers }),
      presets: this.http.get<ThemePreset[]>(`${API}/faculdades/presets`),
    }).subscribe({
      next: ({ tema, temas, presets }) => {
        this.form.patchValue({
          primary_color:         tema.primary_color         ?? DEFAULT_VALUES.primary_color,
          secondary_color:       tema.secondary_color       ?? DEFAULT_VALUES.secondary_color,
          background_color:      tema.background_color      ?? DEFAULT_VALUES.background_color,
          font_family:           tema.font_family           ?? DEFAULT_VALUES.font_family,
          dark_mode:             tema.dark_mode             ?? false,
          dark_primary_color:    tema.dark_primary_color    ?? DEFAULT_VALUES.dark_primary_color,
          dark_secondary_color:  tema.dark_secondary_color  ?? DEFAULT_VALUES.dark_secondary_color,
          dark_background_color: tema.dark_background_color ?? DEFAULT_VALUES.dark_background_color,
        });
        if (tema.logo_url)    this.previewLogo    = tema.logo_url;
        if (tema.favicon_url) this.previewFavicon = tema.favicon_url;
        this.temas       = temas;
        this.presets     = presets;
        this.temaAtivoId = temas.find(t => t.ativo)?.id ?? null;
        this.carregando  = false;
      },
      error: () => { this.form.patchValue(DEFAULT_VALUES); this.carregando = false; },
    });
  }

  // ─── Salvar ───────────────────────────────────────────────────────────────

  salvar(): void {
    if (this.form.invalid) return;
    this.salvando = true;
    this.sucesso  = false;
    this.erro     = '';

    const payload: Record<string, unknown> = { ...this.form.getRawValue() };
    if (this.previewLogo?.startsWith('data:'))    payload['logo_url_override'] = this.previewLogo;
    if (this.previewFavicon?.startsWith('data:')) payload['favicon_url']       = this.previewFavicon;

    this.http.put<any>(`${API}/instituicoes/minha/tema`, payload, { headers: this.headers })
      .subscribe({
        next: data => {
          this.salvando = false;
          this.sucesso  = true;
          this.themeService.applyTheme(data);
          this.carregar();
          setTimeout(() => (this.sucesso = false), 3500);
        },
        error: err => {
          this.salvando = false;
          this.erro = err.error?.detail ?? 'Erro ao salvar. Tente novamente.';
        },
      });
  }

  resetar(): void {
    this.form.reset(DEFAULT_VALUES);
    this.previewLogo    = null;
    this.previewFavicon = null;
  }

  // ─── Presets ──────────────────────────────────────────────────────────────

  aplicarPreset(preset: ThemePreset): void {
    this.form.patchValue({
      primary_color:         preset.primary_color,
      secondary_color:       preset.secondary_color,
      background_color:      preset.background_color,
      font_family:           preset.font_family,
      dark_primary_color:    preset.dark_primary_color,
      dark_secondary_color:  preset.dark_secondary_color,
      dark_background_color: preset.dark_background_color,
    });
    this.showPresets = false;
  }

  // ─── Multi-tema ───────────────────────────────────────────────────────────

  ativarTema(temaId: number): void {
    this.http.post<any>(`${API}/faculdades/minha/temas/${temaId}/ativar`, {}, { headers: this.headers })
      .subscribe({
        next: data => {
          this.themeService.applyTheme(data);
          this.temaAtivoId = temaId;
          this.temas = this.temas.map(t => ({ ...t, ativo: t.id === temaId }));
        },
        error: err => { this.erro = err.error?.detail ?? 'Erro ao ativar tema'; },
      });
  }

  excluirTema(temaId: number): void {
    if (!confirm('Excluir este tema?')) return;
    this.http.delete(`${API}/faculdades/minha/temas/${temaId}`, { headers: this.headers })
      .subscribe({
        next: () => { this.temas = this.temas.filter(t => t.id !== temaId); },
        error: err => { this.erro = err.error?.detail ?? 'Erro ao excluir tema'; },
      });
  }

  // ─── Cores ────────────────────────────────────────────────────────────────

  setColor(controlName: string, event: Event): void {
    this.form.get(controlName)!.setValue((event.target as HTMLInputElement).value);
  }

  // ─── Arquivos ─────────────────────────────────────────────────────────────

  triggerLogoInput():    void { this.logoInputRef.nativeElement.click(); }
  triggerFaviconInput(): void { this.faviconInputRef.nativeElement.click(); }

  onLogoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this._loadFile(file, b64 => (this.previewLogo = b64));
  }

  onFaviconSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this._loadFile(file, b64 => (this.previewFavicon = b64));
  }

  removeLogo(e: MouseEvent): void {
    e.stopPropagation();
    this.previewLogo = null;
    this.logoInputRef.nativeElement.value = '';
  }

  removeFavicon(e: MouseEvent): void {
    e.stopPropagation();
    this.previewFavicon = null;
    this.faviconInputRef.nativeElement.value = '';
  }

  onDragOver(e: DragEvent): void { e.preventDefault(); }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (file?.type.startsWith('image/')) this._loadFile(file, b64 => (this.previewLogo = b64));
  }

  private _loadFile(file: File, cb: (b64: string) => void): void {
    if (file.size > MAX_LOGO_BYTES) { this.erro = 'Imagem deve ter no máximo 2 MB'; return; }
    const reader = new FileReader();
    reader.onload = e => { cb(e.target?.result as string); this.erro = ''; };
    reader.readAsDataURL(file);
  }
}
'''

# ─── Escrita ──────────────────────────────────────────────────────────────────
files = {
    BASE / "core/services/theme.service.ts": THEME_SERVICE,
    BASE / "features/instituicao/pages/tema.component.ts": TEMA_COMPONENT,
}

for path, content in files.items():
    path.write_text(content, encoding="utf-8")
    lines = len(content.splitlines())
    print(f"OK {path.name}: {lines} linhas")
