/**
 * CursaasRippleDirective — feedback visual de click (ripple material).
 *
 * Uso:
 *   <button class="btn btn-primary" cursaasRipple>...</button>
 *   <div class="card" cursaasRipple rippleColor="rgba(0,0,0,0.08)">...</div>
 *
 * Performance:
 *   - Usa apenas transform + opacity (propriedades GPU-composited).
 *   - createElement + appendChild/remove são feitos fora do zone Angular
 *     via ChangeDetectorRef.detach() (não necessário — é DOM puro).
 *   - A animação é declarada via @keyframes ripple-expand em styles.css.
 *   - `will-change` NÃO é aplicado globalmente — só enquanto o elemento
 *     tem ondas ativas (adicionado/removido dinamicamente).
 *   - Cada onda remove a si mesma no `animationend` — sem memory leaks.
 */
import { Directive, ElementRef, HostListener, inject, Input } from '@angular/core';

@Directive({
  selector: '[cursaasRipple]',
  standalone: true,
  host: { class: 'ripple-host' },
})
export class RippleDirective {
  /** Cor da onda. Padrão: cor de texto atual com 20% de opacidade. */
  @Input() rippleColor = 'rgba(255, 255, 255, 0.30)';

  /** Se false, a diretiva não faz nada (permite controle externo). */
  @Input() rippleDisabled = false;

  private readonly _el = inject(ElementRef<HTMLElement>);
  private _activeWaves = 0;

  @HostListener('pointerdown', ['$event'])
  onPointerDown(event: PointerEvent): void {
    if (this.rippleDisabled) return;

    const host = this._el.nativeElement;
    const rect  = host.getBoundingClientRect();
    // Usa o maior lado × 2.5 para garantir cobertura total
    const size  = Math.max(rect.width, rect.height) * 2.5;
    const x     = event.clientX - rect.left - size / 2;
    const y     = event.clientY - rect.top  - size / 2;

    // Garante que o host è posicionado e recorta o overflow
    const style = getComputedStyle(host);
    if (style.position === 'static') {
      host.style.position = 'relative';
    }
    host.style.overflow = 'hidden';

    // Ativa GPU compositing enquanto há ondas
    if (this._activeWaves === 0) {
      host.style.willChange = 'transform';
    }
    this._activeWaves++;

    const wave = document.createElement('span');
    wave.setAttribute('aria-hidden', 'true');
    wave.style.cssText = [
      'position:absolute',
      'border-radius:50%',
      'pointer-events:none',
      'touch-action:none',
      `width:${size}px`,
      `height:${size}px`,
      `left:${x}px`,
      `top:${y}px`,
      'transform:scale(0)',
      `opacity:0.25`,
      `background:${this.rippleColor}`,
      // Usa os tokens do motion system — responde a data-anim e data-transition
      'animation:ripple-expand var(--motion-duration-base) var(--motion-easing-enter) forwards',
    ].join(';');

    host.appendChild(wave);

    wave.addEventListener('animationend', () => {
      wave.remove();
      this._activeWaves = Math.max(0, this._activeWaves - 1);
      if (this._activeWaves === 0) {
        host.style.willChange = '';
      }
    }, { once: true });
  }
}
