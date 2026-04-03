import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  GoogleLoginProvider,
  SocialAuthServiceConfig,
} from '@abacritt/angularx-social-login';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { environment } from './environments/environment';

const googleClientId = environment.googleClientId?.trim() || '';
const googleClientIdConfigured =
  googleClientId.endsWith('.apps.googleusercontent.com') &&
  !googleClientId.includes('SEU_GOOGLE_CLIENT_ID');

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: 'SocialAuthServiceConfig',
      useValue: {
        autoLogin: false,
        providers: googleClientIdConfigured
          ? [
              {
                id: GoogleLoginProvider.PROVIDER_ID,
                provider: new GoogleLoginProvider(googleClientId),
              },
            ]
          : [],
        onError: (error: unknown) => {
          console.error('Erro na autenticacao social:', error);
        },
      } as SocialAuthServiceConfig,
    },
  ],
}).catch((err) => console.error(err));
