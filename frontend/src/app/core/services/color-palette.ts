/**
 * color-palette.ts
 * ================
 * Geração de paleta de cores a partir de uma cor primária — TypeScript puro.
 * Port fiel do color_palette.py do backend.
 *
 * Usado para:
 *  - Preview em tempo real no editor de temas (zero roundtrip ao backend)
 *  - ThemeService: derivar tokens semânticos a partir do primary_color recebido
 *
 * Sem dependências externas.
 */

// ─── Tipos de saída ─────────────────────────────────────────────────────────

export interface ColorScale {
  /** Stop 50–950 no modo claro */
  stops: Record<string, string>;
  /** Stop 50–950 no modo escuro (luminosidades invertidas) */
  darkStops: Record<string, string>;
  /** Hex normalizado da cor de entrada */
  primaryHex: string;
}

export interface SemanticTokens {
  // Light mode
  interactiveDefault:   string;  // primary-500
  interactiveHover:     string;  // primary-400
  interactiveActive:    string;  // primary-600
  interactiveDisabled:  string;  // primary-200
  onInteractive:        string;  // "#fff" ou "#000" — WCAG 4.5:1
  navIndicator:         string;  // primary-200 — resolve o #FFD700 hardcoded
  focusRing:            string;  // primary-300
  backgroundTint:       string;  // primary-50
  backgroundLight:      string;  // off-white com tint do matiz
  secondaryHex:         string;  // primary-700

  // Dark mode
  darkInteractiveDefault:  string;
  darkInteractiveHover:    string;
  darkInteractiveActive:   string;
  darkOnInteractive:       string;
  darkNavIndicator:        string;
  darkBackground:          string;
}

export interface AccessibilityReport {
  primaryOnWhite:   number;
  primaryOnDarkBg:  number;
  whiteOnPrimary:   number;
  blackOnPrimary:   number;
  aaPass:           boolean;  // ≥ 4.5:1
  aaLargePass:      boolean;  // ≥ 3.0:1
  aaaPass:          boolean;  // ≥ 7.0:1
  recommendedTextOnPrimary: '#ffffff' | '#000000';
}

export interface GeneratedPalette {
  scale:         ColorScale;
  tokens:        SemanticTokens;
  accessibility: AccessibilityReport;
}

// ─── Tabelas de lightness ────────────────────────────────────────────────────

const SCALE_LIGHTNESS: Record<string, number> = {
  '50': 0.970, '100': 0.920, '200': 0.840, '300': 0.750, '400': 0.650,
  '500': 0.540, '600': 0.450, '700': 0.360, '800': 0.280, '900': 0.210, '950': 0.150,
};

const SCALE_LIGHTNESS_DARK: Record<string, number> = {
  '50': 0.180, '100': 0.230, '200': 0.300, '300': 0.380, '400': 0.470,
  '500': 0.570, '600': 0.660, '700': 0.740, '800': 0.820, '900': 0.890, '950': 0.940,
};

// ─── Conversões de espaço de cor ─────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').replace(/^([0-9a-f]{3})$/, '$1$1$1');
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error(`Hex inválido: '${hex}'`);
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  c = Math.max(0, c);
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function rgbToOklch(r: number, g: number, b: number): [number, number, number] {
  const rl = srgbToLinear(r), gl = srgbToLinear(g), bl = srgbToLinear(b);

  const x = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  const y = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  const z = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;

  const lc = Math.cbrt(0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z);
  const mc = Math.cbrt(0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z);
  const sc = Math.cbrt(0.0482003018 * x + 0.2643662691 * y + 0.6338517070 * z);

  const L =  0.2104542553 * lc + 0.7936177850 * mc - 0.0040720468 * sc;
  const a =  1.9779984951 * lc - 2.4285922050 * mc + 0.4505937099 * sc;
  const bv = 0.0259040371 * lc + 0.7827717662 * mc - 0.8086757660 * sc;

  return [L, Math.sqrt(a * a + bv * bv), Math.atan2(bv, a)];
}

function oklchToRgb(L: number, C: number, H: number): [number, number, number] {
  L = Math.max(0, Math.min(1, L));
  C = Math.max(0, C);

  const a  = C * Math.cos(H);
  const bv = C * Math.sin(H);

  const lc = Math.pow(L + 0.3963377774 * a + 0.2158037573 * bv, 3);
  const mc = Math.pow(L - 0.1055613458 * a - 0.0638541728 * bv, 3);
  const sc = Math.pow(L - 0.0894841775 * a - 1.2914855480 * bv, 3);

  const x = 1.2270138511 * lc - 0.5577999807 * mc + 0.2812561490 * sc;
  const y = -0.0405801784 * lc + 1.1122568696 * mc - 0.0716766787 * sc;
  const z = -0.0763812845 * lc - 0.4214819784 * mc + 1.5861632204 * sc;

  const rl =  4.0767416621 * x - 3.3077115913 * y + 0.2309699292 * z;
  const gl = -1.2684380046 * x + 2.6097574011 * y - 0.3413193965 * z;
  const bl = -0.0041960863 * x - 0.7034186147 * y + 1.7076147010 * z;

  return [linearToSrgb(rl), linearToSrgb(gl), linearToSrgb(bl)];
}

// ─── Gamut clipping ──────────────────────────────────────────────────────────

function inGamut([r, g, b]: [number, number, number]): boolean {
  return r >= 0 && r <= 1 && g >= 0 && g <= 1 && b >= 0 && b <= 1;
}

function clipToGamut(L: number, C: number, H: number): [number, number, number] {
  if (inGamut(oklchToRgb(L, C, H))) return [L, C, H];
  let lo = 0, hi = C;
  for (let i = 0; i < 15; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToRgb(L, mid, H))) lo = mid; else hi = mid;
  }
  return [L, lo, H];
}

// ─── WCAG ────────────────────────────────────────────────────────────────────

function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

export function contrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const l1 = relativeLuminance(r1, g1, b1);
  const l2 = relativeLuminance(r2, g2, b2);
  const [bright, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (bright + 0.05) / (dark + 0.05);
}

export function bestTextOn(bgHex: string): '#ffffff' | '#000000' {
  return contrastRatio(bgHex, '#ffffff') >= contrastRatio(bgHex, '#000000')
    ? '#ffffff'
    : '#000000';
}

// ─── Manipulação pontual de cor ──────────────────────────────────────────────

/**
 * Clareia (delta > 0) ou escurece (delta < 0) um hex em OKLCH, preservando
 * matiz e croma. Ao contrário de misturar com branco/preto, não desbota a cor.
 */
export function shiftLightness(hex: string, delta: number): string {
  const [r, g, b] = hexToRgb(hex);
  const [L, C, H] = rgbToOklch(r, g, b);
  const target = Math.max(0, Math.min(1, L + delta));
  const [cL, cC, cH] = clipToGamut(target, C, H);
  return rgbToHex(...oklchToRgb(cL, cC, cH));
}

/** Mistura dois hex em sRGB. `ratioA` = fração de `hexA` (0…1). */
export function mixHex(hexA: string, hexB: string, ratioA: number): string {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  const t = Math.max(0, Math.min(1, ratioA));
  return rgbToHex(
    r1 * t + r2 * (1 - t),
    g1 * t + g2 * (1 - t),
    b1 * t + b2 * (1 - t),
  );
}

// ─── Tokens interativos do modo escuro ───────────────────────────────────────

export interface DarkInteractiveTokens {
  interactive:         string;
  interactiveHover:    string;
  interactiveActive:   string;
  interactiveDisabled: string;
  onInteractive:       string;
  navIndicator:        string;
  focusRing:           string;
  brandTint:           string;
}

/**
 * Deriva os tokens interativos do modo escuro a partir do par
 * (dark_primary_color, dark_background_color) escolhido pela instituição.
 *
 * Duas decisões importantes:
 *
 *  - **O interativo é a própria cor escolhida**, não um stop recalculado. Passar
 *    o dark primary por `generatePalette()` e pegar o stop-500 devolvia uma cor
 *    bem mais escura que a do color picker — o botão saía diferente do que o
 *    admin acabara de selecionar, e num fundo escuro ainda por cima.
 *  - **Disabled e tint são misturados com o FUNDO ESCURO**, não com branco. A
 *    fórmula do modo claro (`mix(primary 35%, white)`) produz um cinza quase
 *    branco — que sobre fundo escuro vira o elemento mais brilhante da tela.
 */
export function darkInteractiveTokens(
  darkPrimaryHex:    string,
  darkBackgroundHex: string,
): DarkInteractiveTokens {
  const base = rgbToHex(...hexToRgb(darkPrimaryHex));

  // Garante legibilidade mínima do interativo contra o fundo: se o admin
  // escolher um dark primary escuro demais, clareia até passar de 3:1.
  let interactive = base;
  for (let i = 0; i < 6 && contrastRatio(interactive, darkBackgroundHex) < 3.0; i++) {
    interactive = shiftLightness(interactive, 0.06);
  }

  return {
    interactive,
    interactiveHover:    shiftLightness(interactive,  0.07),
    interactiveActive:   shiftLightness(interactive, -0.07),
    interactiveDisabled: mixHex(interactive, darkBackgroundHex, 0.30),
    onInteractive:       bestTextOn(interactive),
    navIndicator:        shiftLightness(interactive,  0.12),
    focusRing:           interactive,
    brandTint:           mixHex(interactive, darkBackgroundHex, 0.14),
  };
}

// ─── Geração de escala ───────────────────────────────────────────────────────

function generateScale(
  L: number, C: number, H: number,
  lightnessMap: Record<string, number>,
): Record<string, string> {
  const stops: Record<string, string> = {};
  for (const [name, targetL] of Object.entries(lightnessMap)) {
    const distFromCenter = Math.abs(targetL - 0.54);
    const chromaFactor   = Math.max(0, 1 - distFromCenter * 1.4);
    const adjustedC      = C * chromaFactor;
    const [cL, cC, cH]   = clipToGamut(targetL, adjustedC, H);
    const [r, g, b]       = oklchToRgb(cL, cC, cH);
    stops[name] = rgbToHex(r, g, b);
  }
  return stops;
}

// ─── API pública ─────────────────────────────────────────────────────────────

/**
 * Ponto de entrada principal.
 * Recebe qualquer hex e retorna escala, tokens semânticos e relatório WCAG.
 *
 * @example
 * const palette = generatePalette('#1a6b3c');
 * console.log(palette.tokens.interactiveHover);   // '#4aad73'
 * console.log(palette.accessibility.aaPass);       // true
 */
export function generatePalette(primaryHex: string): GeneratedPalette {
  const [r, g, b] = hexToRgb(primaryHex);
  const normalizedHex = rgbToHex(r, g, b);
  const [L, C, H] = rgbToOklch(r, g, b);

  const lightStops = generateScale(L, C, H, SCALE_LIGHTNESS);
  const darkStops  = generateScale(L, C, H, SCALE_LIGHTNESS_DARK);

  // Background light (off-white com tint do matiz)
  const [bgL, bgC, bgH] = clipToGamut(0.980, C * 0.08, H);
  const bgLight = rgbToHex(...oklchToRgb(bgL, bgC, bgH));

  // Background dark (tom escuro com tint)
  const [dbgL, dbgC, dbgH] = clipToGamut(0.130, C * 0.12, H);
  const bgDark = rgbToHex(...oklchToRgb(dbgL, dbgC, dbgH));

  const tokens: SemanticTokens = {
    interactiveDefault:   lightStops['500'],
    interactiveHover:     lightStops['400'],
    interactiveActive:    lightStops['600'],
    interactiveDisabled:  lightStops['200'],
    onInteractive:        bestTextOn(lightStops['500']),
    navIndicator:         lightStops['200'],
    focusRing:            lightStops['300'],
    backgroundTint:       lightStops['50'],
    backgroundLight:      bgLight,
    secondaryHex:         lightStops['700'],

    darkInteractiveDefault:  darkStops['400'],
    darkInteractiveHover:    darkStops['300'],
    darkInteractiveActive:   darkStops['500'],
    darkOnInteractive:       bestTextOn(darkStops['400']),
    darkNavIndicator:        darkStops['300'],
    darkBackground:          bgDark,
  };

  const whiteOn  = contrastRatio('#ffffff', lightStops['500']);
  const blackOn  = contrastRatio('#000000', lightStops['500']);
  const maxRatio = Math.max(whiteOn, blackOn);

  const accessibility: AccessibilityReport = {
    primaryOnWhite:   +contrastRatio(lightStops['500'], '#ffffff').toFixed(2),
    primaryOnDarkBg:  +contrastRatio(lightStops['500'], bgDark).toFixed(2),
    whiteOnPrimary:   +whiteOn.toFixed(2),
    blackOnPrimary:   +blackOn.toFixed(2),
    aaPass:           maxRatio >= 4.5,
    aaLargePass:      maxRatio >= 3.0,
    aaaPass:          maxRatio >= 7.0,
    recommendedTextOnPrimary: bestTextOn(lightStops['500']),
  };

  return {
    scale: { stops: lightStops, darkStops, primaryHex: normalizedHex },
    tokens,
    accessibility,
  };
}

/**
 * Aplica a paleta gerada como CSS custom properties em um elemento raiz.
 * Chamado pelo ThemeService._applyTokens() após receber primary_color.
 *
 * @param root  Elemento alvo — normalmente document.documentElement
 * @param palette Resultado de generatePalette()
 */
export function applyPaletteToRoot(
  root: HTMLElement,
  palette: GeneratedPalette,
): void {
  const { stops, darkStops } = palette.scale;
  const { tokens } = palette;

  // Escala de stops (light e dark)
  for (const [stop, hex] of Object.entries(stops)) {
    root.style.setProperty(`--brand-${stop}`, hex);
  }
  for (const [stop, hex] of Object.entries(darkStops)) {
    root.style.setProperty(`--brand-dark-${stop}`, hex);
  }

  // Tokens semânticos de interação
  root.style.setProperty('--color-interactive',          tokens.interactiveDefault);
  root.style.setProperty('--color-interactive-hover',    tokens.interactiveHover);
  root.style.setProperty('--color-interactive-active',   tokens.interactiveActive);
  root.style.setProperty('--color-interactive-disabled', tokens.interactiveDisabled);
  root.style.setProperty('--color-on-interactive',       tokens.onInteractive);
  root.style.setProperty('--color-nav-indicator',        tokens.navIndicator);
  root.style.setProperty('--color-focus-ring',           tokens.focusRing);
  root.style.setProperty('--color-brand-tint',           tokens.backgroundTint);

  // Tokens dark
  root.style.setProperty('--color-interactive-dark',         tokens.darkInteractiveDefault);
  root.style.setProperty('--color-interactive-hover-dark',   tokens.darkInteractiveHover);
  root.style.setProperty('--color-interactive-active-dark',  tokens.darkInteractiveActive);
  root.style.setProperty('--color-on-interactive-dark',      tokens.darkOnInteractive);
  root.style.setProperty('--color-nav-indicator-dark',       tokens.darkNavIndicator);
}

/**
 * Sobrescreve os tokens dark semânticos a partir do par
 * (dark_primary_color, dark_background_color) explícito da instituição.
 *
 * Chamado por ThemeService._applyTokens() após applyPaletteToRoot().
 * Garante que temas com um dark_primary_color de hue diferente do primary
 * claro tenham tokens interativos corretos em dark mode.
 *
 * @param root              Elemento raiz — normalmente document.documentElement
 * @param darkPrimaryHex    dark_primary_color do tema
 * @param darkBackgroundHex dark_background_color do tema
 */
export function applyDarkOverrideToRoot(
  root:              HTMLElement,
  darkPrimaryHex:    string,
  darkBackgroundHex: string,
): DarkInteractiveTokens {
  const t = darkInteractiveTokens(darkPrimaryHex, darkBackgroundHex);

  // Escala brand-dark-* recalculada a partir do hue do dark primary
  const { stops } = generatePalette(darkPrimaryHex).scale;
  for (const [stop, hex] of Object.entries(stops)) {
    root.style.setProperty(`--brand-dark-${stop}`, hex);
  }

  root.style.setProperty('--color-interactive-dark',          t.interactive);
  root.style.setProperty('--color-interactive-hover-dark',    t.interactiveHover);
  root.style.setProperty('--color-interactive-active-dark',   t.interactiveActive);
  root.style.setProperty('--color-interactive-disabled-dark', t.interactiveDisabled);
  root.style.setProperty('--color-on-interactive-dark',       t.onInteractive);
  root.style.setProperty('--color-nav-indicator-dark',        t.navIndicator);
  root.style.setProperty('--color-focus-ring-dark',           t.focusRing);
  root.style.setProperty('--color-brand-tint-dark',           t.brandTint);

  return t;
}

/**
 * Escreve os tokens interativos **efetivos** (os nomes sem sufixo) conforme o
 * modo ativo.
 *
 * Por que isto existe: `applyPaletteToRoot()` grava `--color-interactive` &
 * cia. como estilo *inline* no `<html>`, e estilo inline vence qualquer regra
 * de folha de estilo — inclusive `:root[data-theme="dark"] { --color-interactive:
 * var(--color-interactive-dark) }`. Sem esta função, o modo escuro continuava
 * pintando botões, links e focus rings com a cor do modo claro sobre o fundo
 * escuro.
 */
export function applyEffectiveInteractive(
  root:   HTMLElement,
  light:  GeneratedPalette | null,
  dark:   DarkInteractiveTokens | null,
  isDark: boolean,
): void {
  const set = (k: string, v: string) => root.style.setProperty(k, v);

  if (isDark && dark) {
    set('--color-interactive',          dark.interactive);
    set('--color-interactive-hover',    dark.interactiveHover);
    set('--color-interactive-active',   dark.interactiveActive);
    set('--color-interactive-disabled', dark.interactiveDisabled);
    set('--color-on-interactive',       dark.onInteractive);
    set('--color-nav-indicator',        dark.navIndicator);
    set('--color-focus-ring',           dark.focusRing);
    set('--color-brand-tint',           dark.brandTint);
    return;
  }

  if (!isDark && light) {
    const { tokens } = light;
    set('--color-interactive',          tokens.interactiveDefault);
    set('--color-interactive-hover',    tokens.interactiveHover);
    set('--color-interactive-active',   tokens.interactiveActive);
    set('--color-interactive-disabled', tokens.interactiveDisabled);
    set('--color-on-interactive',       tokens.onInteractive);
    set('--color-nav-indicator',        tokens.navIndicator);
    set('--color-focus-ring',           tokens.focusRing);
    set('--color-brand-tint',           tokens.backgroundTint);
  }
}
