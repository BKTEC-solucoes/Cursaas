import { Component, ElementRef, OnDestroy, OnInit, ViewChild, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService, ThemePreset, ThemeListItem, PageOverride } from '../../../core/services/theme.service';
import { PagePreviewComponent, PreviewPage, PreviewTheme } from './previews/page-preview.component';

interface TemaValues {
  primary_color: string;
  secondary_color: string;
  background_color: string;
  font_family: string;
  dark_mode: boolean;
  dark_primary_color: string;
  dark_secondary_color: string;
  dark_background_color: string;
  border_radius: string;
  layout_type: 'topbar' | 'sidebar';
  gradient_enabled: boolean;
  shadow_level: 'none' | 'soft' | 'strong';
  spacing: 'compact' | 'comfortable' | 'spacious';
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

export const RADIUS_OPTIONS = [
  { label: 'Nenhum', value: '0px'    },
  { label: 'Leve',   value: '4px'    },
  { label: 'Médio',  value: '8px'    },
  { label: 'Grande', value: '16px'   },
  { label: 'Pill',   value: '9999px' },
];

export const SHADOW_OPTIONS = [
  { label: 'Sem sombra', value: 'none'   },
  { label: 'Suave',      value: 'soft'   },
  { label: 'Intensa',    value: 'strong' },
];

export const SPACING_OPTIONS = [
  { label: 'Compacto',    value: 'compact'     },
  { label: 'Confortável', value: 'comfortable' },
  { label: 'Espaçado',    value: 'spacious'    },
];

export const LAYOUT_OPTIONS = [
  { label: 'Barra superior', value: 'topbar'  },
  { label: 'Menu lateral',   value: 'sidebar' },
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
  border_radius:         '8px',
  layout_type:           'topbar',
  gradient_enabled:      false,
  shadow_level:          'soft',
  spacing:               'comfortable',
};

const API = 'http://localhost:8000/api';
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

@Component({
  selector: 'app-instituicao-tema',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PagePreviewComponent],
  templateUrl: './tema.component.html',
  styleUrls: ['./tema.component.css'],
})
export class InstituicaoTemaComponent implements OnInit, OnDestroy {
  @ViewChild('logoInput')    logoInputRef!:    ElementRef<HTMLInputElement>;
  @ViewChild('faviconInput') faviconInputRef!: ElementRef<HTMLInputElement>;

  form: FormGroup;
  previewLogo:    string | null = null;
  previewFavicon: string | null = null;
  fontOptions    = FONT_OPTIONS;
  radiusOptions  = RADIUS_OPTIONS;
  shadowOptions  = SHADOW_OPTIONS;
  spacingOptions = SPACING_OPTIONS;
  layoutOptions  = LAYOUT_OPTIONS;

  temas:   ThemeListItem[] = [];
  presets: ThemePreset[]   = [];
  showPresets = false;
  temaAtivoId: number | null = null;

  carregando = true;
  salvando   = false;
  sucesso    = false;
  erro       = '';

  // ─── Per-page theme ───────────────────────────────────────────────────────

  /** Página selecionada no editor: 'global' | nome da página */
  selectedPage = signal<'global' | PreviewPage>('global');

  /** Estrutura de overrides acumulados por página  */
  pageOverrides: Record<PreviewPage, PageOverride> = {
    dashboard: {},
    alunos:    {},
    cursos:    {},
    aulas:     {},
    notas:     {},
    perfil:    {},
  };

  /** Formulário simplificado de override por página */
  pageForm: FormGroup;

  readonly PAGE_TABS: { key: 'global' | PreviewPage; label: string; icon: string }[] = [
    { key: 'global',    label: 'Global',     icon: '🌐' },
    { key: 'dashboard', label: 'Dashboard',  icon: '🏠' },
    { key: 'alunos',    label: 'Alunos',     icon: '👨‍🎓' },
    { key: 'cursos',    label: 'Cursos',     icon: '📚' },
    { key: 'aulas',     label: 'Aulas',      icon: '🎬' },
    { key: 'notas',     label: 'Notas',      icon: '📊' },
    { key: 'perfil',    label: 'Perfil',     icon: '🏛️' },
  ];

  /** Tema efetivo para o preview (global + override da página selecionada) */
  get previewTheme(): PreviewTheme {
    const g = this.form.getRawValue();
    const page = this.selectedPage();
    if (page === 'global') return g;
    const override = this.pageOverrides[page as PreviewPage] ?? {};
    return { ...g, ...override };
  }

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
      border_radius:         [DEFAULT_VALUES.border_radius],
      layout_type:           [DEFAULT_VALUES.layout_type],
      gradient_enabled:      [DEFAULT_VALUES.gradient_enabled],
      shadow_level:          [DEFAULT_VALUES.shadow_level],
      spacing:               [DEFAULT_VALUES.spacing],
    });

    // Formulário simplificado para overrides por página
    this.pageForm = this.fb.nonNullable.group({
      primary_color:    [''],
      secondary_color:  [''],
      background_color: [''],
      border_radius:    [''],
      button_style:     [''],
      shadow_level:     [''],
      gradient_enabled: [false],
    });
  }

  ngOnInit(): void {
    // Preview global em tempo real
    this.form.valueChanges.pipe(
      debounceTime(30),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      takeUntil(this.destroy$),
    ).subscribe(values => this.themeService.applyTheme({
      ...values,
      logo_url:    this.previewLogo    ?? undefined,
      favicon_url: this.previewFavicon ?? undefined,
    }));

    // Atualiza pageOverrides em tempo real ao editar o form por página
    this.pageForm.valueChanges.pipe(
      debounceTime(30),
      takeUntil(this.destroy$),
    ).subscribe(values => {
      const page = this.selectedPage();
      if (page !== 'global') {
        // Filtra apenas campos preenchidos (não-vazios)
        const filtered: PageOverride = {};
        for (const [k, v] of Object.entries(values)) {
          if (v !== '' && v !== null && v !== undefined) {
            (filtered as any)[k] = v;
          }
        }
        this.pageOverrides[page as PreviewPage] = filtered;
      }
    });

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

  // ─── Seleção de página ────────────────────────────────────────────────────

  selectPage(page: 'global' | PreviewPage): void {
    this.selectedPage.set(page);
    if (page !== 'global') {
      const existing = this.pageOverrides[page] ?? {};
      this.pageForm.patchValue({
        primary_color:    existing.primary_color    ?? '',
        secondary_color:  existing.secondary_color  ?? '',
        background_color: existing.background_color ?? '',
        border_radius:    existing.border_radius    ?? '',
        button_style:     existing.button_style     ?? '',
        shadow_level:     existing.shadow_level     ?? '',
        gradient_enabled: existing.gradient_enabled ?? false,
      }, { emitEvent: false });
    }
  }

  clearPageOverride(): void {
    const page = this.selectedPage();
    if (page !== 'global') {
      this.pageOverrides[page as PreviewPage] = {};
      this.pageForm.reset({ primary_color: '', secondary_color: '', background_color: '',
        border_radius: '', button_style: '', shadow_level: '', gradient_enabled: false });
    }
  }

  setPageColor(controlName: string, event: Event): void {
    this.pageForm.get(controlName)!.setValue((event.target as HTMLInputElement).value);
  }

  get hasPageOverride(): boolean {
    const page = this.selectedPage();
    if (page === 'global') return false;
    const o = this.pageOverrides[page as PreviewPage];
    return !!o && Object.keys(o).length > 0;
  }

  /** Retorna true se a página informada tem overrides — usado no template */
  hasOverrideForPage(key: 'global' | PreviewPage): boolean {
    if (key === 'global') return false;
    const o = this.pageOverrides[key as PreviewPage];
    return !!o && Object.keys(o).length > 0;
  }

  /** Getter tipado como PreviewPage para o template (nunca chamado quando page==='global') */
  get pageNameForPreview(): PreviewPage {
    return this.selectedPage() as PreviewPage;
  }

  carregar(): void {
    this.carregando = true;
    forkJoin({
      tema:    this.http.get<any>(`${API}/faculdades/minha/tema`, { headers: this.headers }),
      temas:   this.http.get<ThemeListItem[]>(`${API}/faculdades/minha/temas`, { headers: this.headers })
                 .pipe(catchError(() => of([] as ThemeListItem[]))),
      presets: this.http.get<ThemePreset[]>(`${API}/faculdades/presets`)
                 .pipe(catchError(() => of([] as ThemePreset[]))),
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
          border_radius:         tema.border_radius         ?? DEFAULT_VALUES.border_radius,
          layout_type:           tema.layout_type           ?? DEFAULT_VALUES.layout_type,
          gradient_enabled:      tema.gradient_enabled      ?? DEFAULT_VALUES.gradient_enabled,
          shadow_level:          tema.shadow_level          ?? DEFAULT_VALUES.shadow_level,
          spacing:               tema.spacing               ?? DEFAULT_VALUES.spacing,
        });
        if (tema.logo_url)    this.previewLogo    = tema.logo_url;
        if (tema.favicon_url) this.previewFavicon = tema.favicon_url;

        // Restaurar overrides por página vindos do backend
        if (tema.page_overrides) {
          for (const p of ['dashboard', 'alunos', 'cursos', 'aulas', 'notas', 'perfil'] as PreviewPage[]) {
            if (tema.page_overrides[p]) {
              this.pageOverrides[p] = tema.page_overrides[p];
            }
          }
        }

        this.temas       = temas;
        this.presets     = presets;
        this.temaAtivoId = temas.find(t => t.ativo)?.id ?? null;
        this.carregando  = false;
      },
      error: () => { this.carregando = false; },
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

    // Inclui overrides por página (filtra páginas sem configuração)
    const nonEmptyOverrides: Record<string, PageOverride> = {};
    for (const [page, override] of Object.entries(this.pageOverrides)) {
      if (override && Object.keys(override).length > 0) {
        nonEmptyOverrides[page] = override;
      }
    }
    payload['page_overrides'] = Object.keys(nonEmptyOverrides).length > 0 ? nonEmptyOverrides : null;

    this.http.put<any>(`${API}/faculdades/minha/tema`, payload, { headers: this.headers })
      .subscribe({
        next: data => {
          this.salvando = false;
          this.sucesso  = true;
          this.themeService.applyTheme(data);
          // Atualiza a lista de temas silenciosamente (sem derrubar o form em caso de falha)
          this.http.get<ThemeListItem[]>(`${API}/faculdades/minha/temas`, { headers: this.headers })
            .pipe(catchError(() => of(this.temas)))
            .subscribe(temas => {
              this.temas       = temas;
              this.temaAtivoId = temas.find(t => t.ativo)?.id ?? null;
            });
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
