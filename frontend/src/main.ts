import { APP_INITIALIZER } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { ThemeService } from './app/core/services/theme.service';

/**
 * Executa antes do primeiro render — lê o tema do localStorage e aplica
 * as CSS variables imediatamente, evitando qualquer flicker de layout.
 */
function initTheme(themeService: ThemeService): () => void {
  return () => themeService.aplicarDoCache();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: initTheme,
      deps: [ThemeService],
      multi: true,
    },
  ],
}).catch((err) => console.error(err));
