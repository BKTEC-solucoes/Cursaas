import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { catchError, of, timeout } from 'rxjs';
import { ThemeService, Theme } from '../services/theme.service';
import { AuthService } from '../services/auth.service';

/**
 * Resolver de tema: garante que o tema da instituição seja buscado do
 * backend ANTES de qualquer componente da rota ser renderizado.
 *
 * Regras aplicadas:
 * - Sempre busca do backend (ignora TTL do cache) — o localStorage é
 *   apenas um fallback visual, nunca a fonte de verdade.
 * - Timeout de 5 segundos: se o backend não responder, cai no fallback
 *   do cache para não travar a navegação.
 * - Em caso de erro (rede, 401, etc.), o ThemeService.carregarEAplicar
 *   já aplica o DEFAULT_THEME internamente.
 *
 * Posição na cadeia de rota:
 *   authGuard → roleGuard → themeResolver → [renderiza componentes]
 *
 * Onde usar:
 *   Aplicar na rota pai de cada área autenticada (/aluno, /instituicao, /admin).
 *   O resolver só dispara quando a rota PAI é ativada (entrada na área),
 *   não em cada navegação interna — isso evita chamadas excessivas ao backend.
 *
 * Otimização (carregarSeNecessario):
 *   Se o APP_INITIALIZER Stage 2 já buscou o tema nos últimos 30s, o resolver
 *   reutiliza o tema em memória sem nova requisição. Se a requisição ainda
 *   estiver em andamento, ambos compartilham o mesmo Observable (shareReplay).
 */
export const themeResolver: ResolveFn<Theme | null> = () => {
  const themeService = inject(ThemeService);
  const authService  = inject(AuthService);

  const token = authService.getToken();

  // authGuard já bloqueia rotas sem token, mas garantimos aqui por defesa
  if (!token) {
    themeService.aplicarDoCache();
    return of(null);
  }

  return themeService.carregarSeNecessario(token).pipe(
    // Evita travar a navegação se o backend demorar mais de 5s
    timeout(5000),
    catchError(() => {
      // Backend indisponível: usa o cache como fallback gracioso
      themeService.aplicarDoCache();
      return of(null);
    }),
  );
};
