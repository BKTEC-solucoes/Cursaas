"""
color_palette.py
================
Geração automática de paleta de cores a partir de uma cor primária (hex).

Algoritmo:
  1. Converte hex → sRGB linear → OKLCH  (espaço perceptualmente uniforme)
  2. Gera 11 stops (50–950) variando apenas o lightness em OKLCH.
     Isso garante que a escala pareça linear ao olho humano em qualquer matiz.
  3. Deriva tokens semânticos fundamentais (hover, active, disabled, etc.)
  4. Calcula a cor de contraste de texto (branco vs preto) via WCAG 2.1.
  5. Valida contraste mínimo 3:1 (AA Large) entre primary e background.

Sem dependências externas — math puro.
Usado em:
  - faculdades.py: PUT /minha/tema (antes de persistir, valida e enriquece payload)
  - Endpoint GET /minha/tema: injeta `primary_scale` computado na resposta
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from typing import Optional


# ─── Constantes ───────────────────────────────────────────────────────────────

# Lightness alvo para cada stop da escala (0.0 – 1.0 em OKLCH).
# Escolhidas para que 500 ≈ cor original, 50 ≈ quase branco, 950 ≈ quase preto.
_SCALE_LIGHTNESS: dict[str, float] = {
    "50":  0.970,
    "100": 0.920,
    "200": 0.840,
    "300": 0.750,
    "400": 0.650,
    "500": 0.540,  # próximo do primário fornecido
    "600": 0.450,
    "700": 0.360,
    "800": 0.280,
    "900": 0.210,
    "950": 0.150,
}

# Lightness alvo para a versão dark de cada stop.
# Inverte os extremos: dark-50 é quase preto, dark-950 é quase branco.
_SCALE_LIGHTNESS_DARK: dict[str, float] = {
    "50":  0.180,
    "100": 0.230,
    "200": 0.300,
    "300": 0.380,
    "400": 0.470,
    "500": 0.570,
    "600": 0.660,
    "700": 0.740,
    "800": 0.820,
    "900": 0.890,
    "950": 0.940,
}

# Backgrounds padrão por modo
_BG_LIGHT_LIGHTNESS = 0.980
_BG_DARK_LIGHTNESS  = 0.130


# ─── Tipos de saída ────────────────────────────────────────────────────────────

@dataclass
class ColorScale:
    """Escala de 11 stops gerada a partir de uma cor primária."""
    stops:       dict[str, str]       # {"50": "#e8f5ee", "500": "#1a6b3c", ...}
    dark_stops:  dict[str, str]       # mesma estrutura para dark mode
    primary_hex: str                  # hex original normalizado


@dataclass
class SemanticTokens:
    """
    Tokens semânticos derivados automaticamente da cor primária.

    Todos os tokens de interação (hover, active, disabled) vêm da escala,
    nunca de filter/brightness — o que os torna visualmente corretos para
    qualquer matiz, incluindo cores muito escuras ou muito claras.
    """
    # Light mode
    interactive_default:    str   # primary-500
    interactive_hover:      str   # primary-400
    interactive_active:     str   # primary-600
    interactive_disabled:   str   # primary-200
    on_interactive:         str   # "#fff" ou "#000" (WCAG 4.5:1)
    nav_indicator:          str   # primary-200 (indicador ativo na nav)
    focus_ring:             str   # primary-300
    background_tint:        str   # primary-50
    background_light:       str   # background off-white derivado do matiz
    secondary_hex:          str   # primary-700 como sugestão de secondary

    # Dark mode
    dark_interactive_default:  str  # dark-300
    dark_interactive_hover:    str  # dark-200
    dark_interactive_active:   str  # dark-400
    dark_on_interactive:       str  # "#000" ou "#fff"
    dark_nav_indicator:        str  # dark-200
    dark_background:           str  # cor de bg escura com tint do matiz


@dataclass
class AccessibilityReport:
    """Resultado da validação WCAG 2.1."""
    primary_on_white:    float
    primary_on_dark_bg:  float
    white_on_primary:    float
    black_on_primary:    float
    aa_pass:             bool   # ≥ 4.5:1 para texto normal
    aa_large_pass:       bool   # ≥ 3.0:1 para texto grande / UI components
    aaa_pass:            bool   # ≥ 7.0:1
    recommended_text_on_primary: str  # "#fff" ou "#000"


@dataclass
class GeneratedPalette:
    scale:        ColorScale
    tokens:       SemanticTokens
    accessibility: AccessibilityReport


# ─── 1. Conversões de espaço de cor ───────────────────────────────────────────

def _hex_to_rgb(hex_color: str) -> tuple[float, float, float]:
    """'#1a6b3c' → (0.1020, 0.4196, 0.2353)  (sRGB 0–1)."""
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) != 6 or not re.fullmatch(r"[0-9a-fA-F]{6}", h):
        raise ValueError(f"Cor hex inválida: '{hex_color}'")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return r / 255, g / 255, b / 255


def _rgb_to_hex(r: float, g: float, b: float) -> str:
    """(0.1, 0.4, 0.2) → '#1a6633'  (clamp automático)."""
    ri = max(0, min(255, round(r * 255)))
    gi = max(0, min(255, round(g * 255)))
    bi = max(0, min(255, round(b * 255)))
    return f"#{ri:02x}{gi:02x}{bi:02x}"


def _srgb_to_linear(c: float) -> float:
    """Linearização sRGB (IEC 61966-2-1)."""
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _linear_to_srgb(c: float) -> float:
    """sRGB a partir de linear (IEC 61966-2-1)."""
    c = max(0.0, c)
    return c * 12.92 if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055


def _rgb_to_oklch(r: float, g: float, b: float) -> tuple[float, float, float]:
    """
    sRGB → OKLCH  (Björn Ottosson, 2020).
    Retorna (L, C, H) onde L ∈ [0,1], C ≥ 0, H ∈ [0, 2π].
    """
    # sRGB → XYZ D65
    rl, gl, bl = _srgb_to_linear(r), _srgb_to_linear(g), _srgb_to_linear(b)

    x = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl
    y = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl
    z = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl

    # XYZ → LMS (Bradford-like para OKLAB)
    l_cone = (0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z) ** (1/3)
    m_cone = (0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z) ** (1/3)
    s_cone = (0.0482003018 * x + 0.2643662691 * y + 0.6338517070 * z) ** (1/3)

    # LMS → OKLAB
    L = 0.2104542553 * l_cone + 0.7936177850 * m_cone - 0.0040720468 * s_cone
    a = 1.9779984951 * l_cone - 2.4285922050 * m_cone + 0.4505937099 * s_cone
    b_ = 0.0259040371 * l_cone + 0.7827717662 * m_cone - 0.8086757660 * s_cone

    # OKLAB → OKLCH
    C = math.sqrt(a * a + b_ * b_)
    H = math.atan2(b_, a)  # radianos [-π, π]
    return L, C, H


def _oklch_to_rgb(L: float, C: float, H: float) -> tuple[float, float, float]:
    """OKLCH → sRGB  (inverso de _rgb_to_oklch, com chroma gamut-clipping)."""
    # Garante valores dentro de range válido
    L = max(0.0, min(1.0, L))
    C = max(0.0, C)

    a = C * math.cos(H)
    b_ = C * math.sin(H)

    l_cone = (L + 0.3963377774 * a + 0.2158037573 * b_) ** 3
    m_cone = (L - 0.1055613458 * a - 0.0638541728 * b_) ** 3
    s_cone = (L - 0.0894841775 * a - 1.2914855480 * b_) ** 3

    x = 1.2270138511 * l_cone - 0.5577999807 * m_cone + 0.2812561490 * s_cone
    y = -0.0405801784 * l_cone + 1.1122568696 * m_cone - 0.0716766787 * s_cone
    z = -0.0763812845 * l_cone - 0.4214819784 * m_cone + 1.5861632204 * s_cone

    rl = 4.0767416621 * x - 3.3077115913 * y + 0.2309699292 * z
    gl = -1.2684380046 * x + 2.6097574011 * y - 0.3413193965 * z
    bl = -0.0041960863 * x - 0.7034186147 * y + 1.7076147010 * z

    return (
        _linear_to_srgb(rl),
        _linear_to_srgb(gl),
        _linear_to_srgb(bl),
    )


# ─── 2. Gamut clipping ────────────────────────────────────────────────────────

def _clip_to_gamut(L: float, C: float, H: float) -> tuple[float, float, float]:
    """
    Reduz chroma C até que o resultado esteja dentro de sRGB [0,1].
    Estratégia: bissecção (rápida, max 15 iterações).
    Preserva L e H — apenas C é ajustado.
    """
    r, g, b = _oklch_to_rgb(L, C, H)
    if all(0.0 <= v <= 1.0 for v in (r, g, b)):
        return L, C, H

    lo, hi = 0.0, C
    for _ in range(15):
        mid = (lo + hi) / 2
        r, g, b = _oklch_to_rgb(L, mid, H)
        if all(0.0 <= v <= 1.0 for v in (r, g, b)):
            lo = mid
        else:
            hi = mid

    return L, lo, H


# ─── 3. WCAG contrast ratio ───────────────────────────────────────────────────

def _relative_luminance(r: float, g: float, b: float) -> float:
    """Luminância relativa WCAG 2.1 a partir de sRGB [0,1]."""
    rl = _srgb_to_linear(r)
    gl = _srgb_to_linear(g)
    bl = _srgb_to_linear(b)
    return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl


def contrast_ratio(hex1: str, hex2: str) -> float:
    """Contrast ratio WCAG 2.1 entre duas cores hex. Retorna valor ≥ 1.0."""
    r1, g1, b1 = _hex_to_rgb(hex1)
    r2, g2, b2 = _hex_to_rgb(hex2)
    l1 = _relative_luminance(r1, g1, b1)
    l2 = _relative_luminance(r2, g2, b2)
    bright, dark = max(l1, l2), min(l1, l2)
    return (bright + 0.05) / (dark + 0.05)


def best_text_on(bg_hex: str) -> str:
    """
    Retorna '#ffffff' ou '#000000', o que tiver maior contraste contra bg_hex.
    Garante WCAG 4.5:1 sempre que possível.
    """
    white_c = contrast_ratio(bg_hex, "#ffffff")
    black_c = contrast_ratio(bg_hex, "#000000")
    return "#ffffff" if white_c >= black_c else "#000000"


# ─── 4. Geração de escala ─────────────────────────────────────────────────────

def _generate_scale(
    L: float, C: float, H: float,
    lightness_map: dict[str, float],
) -> dict[str, str]:
    """
    Gera os stops da escala variando apenas L em OKLCH.
    C é reduzido proporcionalmente para stops muito claros/escuros
    (onde alto chroma não cabe no gamut sRGB).
    """
    stops: dict[str, str] = {}
    for name, target_L in lightness_map.items():
        # Escala o chroma: mantém o máximo no stop original,
        # reduz gradualmente nos extremos (heurística triangular).
        distance_from_center = abs(target_L - 0.54)
        chroma_factor = max(0.0, 1.0 - distance_from_center * 1.4)
        adjusted_C = C * chroma_factor

        cL, cC, cH = _clip_to_gamut(target_L, adjusted_C, H)
        r, g, b = _oklch_to_rgb(cL, cC, cH)
        stops[name] = _rgb_to_hex(r, g, b)
    return stops


# ─── 5. API pública ───────────────────────────────────────────────────────────

def generate_palette(primary_hex: str) -> GeneratedPalette:
    """
    Ponto de entrada principal.
    Recebe um hex qualquer e retorna escala, tokens semânticos e relatório WCAG.
    """
    # Normaliza o hex
    r, g, b = _hex_to_rgb(primary_hex)
    primary_hex = _rgb_to_hex(r, g, b)

    L, C, H = _rgb_to_oklch(r, g, b)

    # ── 1. Gera escala light e dark ──────────────────────────────────────────
    light_stops = _generate_scale(L, C, H, _SCALE_LIGHTNESS)
    dark_stops  = _generate_scale(L, C, H, _SCALE_LIGHTNESS_DARK)

    # ── 2. Background light (tint quase neutro do matiz) ────────────────────
    cL, cC, cH = _clip_to_gamut(_BG_LIGHT_LIGHTNESS, C * 0.08, H)
    bg_r, bg_g, bg_b = _oklch_to_rgb(cL, cC, cH)
    background_light = _rgb_to_hex(bg_r, bg_g, bg_b)

    # ── 3. Background dark (tom escuro com tint) ────────────────────────────
    cL, cC, cH = _clip_to_gamut(_BG_DARK_LIGHTNESS, C * 0.12, H)
    dbg_r, dbg_g, dbg_b = _oklch_to_rgb(cL, cC, cH)
    dark_background = _rgb_to_hex(dbg_r, dbg_g, dbg_b)

    # ── 4. Tokens semânticos ─────────────────────────────────────────────────
    tokens = SemanticTokens(
        # Light — usa os stops da escala diretamente
        interactive_default  = light_stops["500"],
        interactive_hover    = light_stops["400"],
        interactive_active   = light_stops["600"],
        interactive_disabled = light_stops["200"],
        on_interactive       = best_text_on(light_stops["500"]),
        nav_indicator        = light_stops["200"],
        focus_ring           = light_stops["300"],
        background_tint      = light_stops["50"],
        background_light     = background_light,
        secondary_hex        = light_stops["700"],

        # Dark — a escala dark vai de mais escuro (50) a mais claro (950)
        dark_interactive_default  = dark_stops["400"],
        dark_interactive_hover    = dark_stops["300"],
        dark_interactive_active   = dark_stops["500"],
        dark_on_interactive       = best_text_on(dark_stops["400"]),
        dark_nav_indicator        = dark_stops["300"],
        dark_background           = dark_background,
    )

    # ── 5. Acessibilidade ────────────────────────────────────────────────────
    primary_on_white   = contrast_ratio(light_stops["500"], "#ffffff")
    primary_on_dark_bg = contrast_ratio(light_stops["500"], dark_background)
    white_on_primary   = contrast_ratio("#ffffff", light_stops["500"])
    black_on_primary   = contrast_ratio("#000000", light_stops["500"])

    a11y = AccessibilityReport(
        primary_on_white    = round(primary_on_white,   2),
        primary_on_dark_bg  = round(primary_on_dark_bg, 2),
        white_on_primary    = round(white_on_primary,   2),
        black_on_primary    = round(black_on_primary,   2),
        aa_pass             = max(white_on_primary, black_on_primary) >= 4.5,
        aa_large_pass       = max(white_on_primary, black_on_primary) >= 3.0,
        aaa_pass            = max(white_on_primary, black_on_primary) >= 7.0,
        recommended_text_on_primary = best_text_on(light_stops["500"]),
    )

    return GeneratedPalette(
        scale=ColorScale(
            stops       = light_stops,
            dark_stops  = dark_stops,
            primary_hex = primary_hex,
        ),
        tokens  = tokens,
        accessibility = a11y,
    )


def validate_contrast(primary_hex: str, background_hex: str = "#ffffff") -> AccessibilityReport:
    """
    Valida apenas o contraste entre primary e um background específico.
    Usado na rota PUT /minha/tema antes de persistir.
    """
    r, g, b = _hex_to_rgb(primary_hex)
    primary_hex = _rgb_to_hex(r, g, b)

    white_on_primary = contrast_ratio("#ffffff", primary_hex)
    black_on_primary = contrast_ratio("#000000", primary_hex)
    primary_on_white = contrast_ratio(primary_hex, "#ffffff")
    primary_on_bg    = contrast_ratio(primary_hex, background_hex)

    return AccessibilityReport(
        primary_on_white    = round(primary_on_white,   2),
        primary_on_dark_bg  = round(primary_on_bg,      2),
        white_on_primary    = round(white_on_primary,   2),
        black_on_primary    = round(black_on_primary,   2),
        aa_pass             = max(white_on_primary, black_on_primary) >= 4.5,
        aa_large_pass       = max(white_on_primary, black_on_primary) >= 3.0,
        aaa_pass            = max(white_on_primary, black_on_primary) >= 7.0,
        recommended_text_on_primary = best_text_on(primary_hex),
    )
