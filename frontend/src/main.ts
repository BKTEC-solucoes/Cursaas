import { APP_INITIALIZER } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { ThemeService } from './app/core/services/theme.service';
import { AuthService } from './app/core/services/auth.service';

/**
 * ETAPA 1 — Síncrona, executa ANTES do primeiro render.
 *
 * Lê o tema persistido no localStorage e aplica as CSS variables
 * no <html> imediatamente. O Angular só monta o DOM após todas as
 * factories do APP_INITIALIZER retornarem, então nenhum componente
 * é pintado antes das variáveis estarem presentes — zero flash visual.
 *
 * Deliberadamente NÃO retorna Promise: não bloqueia o bootstrap enquanto
 * aguarda o backend. A busca real acontece em background na etapa abaixo.
 */
function initThemeDaCache(themeService: ThemeService): () => void {
  return () => themeService.aplicarDoCache();
}

/**
 * ETAPA 2 — Síncrona na chamada, assíncrona no efeito.
 *
 * Se já existe uma sessão ativa (token no localStorage), dispara uma
 * requisição HTTP em background para buscar o tema atualizado do backend
 * SEM bloquear o bootstrap. Quando a resposta chega, o ThemeService
 * atualiza as CSS variables e todos os componentes já montados reagem
 * automaticamente (via var(--primary) etc.).
 *
 * Isso garante que:
 * - Um F5 com sessão ativa sempre converge para o tema atual da instituição
 * - Temas alterados pela instituição chegam ao aluno sem exigir re-login
 * - O startup não fica lento aguardando o backend
 */
function initThemeDoBackend(themeService: ThemeService, authService: AuthService): () => void {
  return () => {
    const token = authService.getToken();
    if (token) {
      // carregarSeNecessario: se o resolver já tiver respondido antes do bootstrap
      // terminar (raro, mas possível), reutiliza o tema em memória sem 2ª request.
      // Na prática, ambos disparam quase juntos e a deduplicação in-flight garante
      // que apenas uma única chamada HTTP é feita ao backend.
      themeService.carregarSeNecessario(token).subscribe();
    }
  };
}

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    // Etapa 1: cache → sem flash
    {
      provide: APP_INITIALIZER,
      useFactory: initThemeDaCache,
      deps: [ThemeService],
      multi: true,
    },
    // Etapa 2: backend → tema sempre atualizado após refresh
    {
      provide: APP_INITIALIZER,
      useFactory: initThemeDoBackend,
      deps: [ThemeService, AuthService],
      multi: true,
    },
  ],
}).catch((err) => console.error(err));
