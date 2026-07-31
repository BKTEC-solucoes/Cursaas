import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { FaculdadeAtivaService } from '../services/faculdade-ativa.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const faculdadeAtiva = inject(FaculdadeAtivaService);
  const token = authService.getToken();

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Escopo de tenant do super admin: diz ao backend qual instituição ele está
  // gerenciando. Só vai para a API do FastAPI — o side-car do Google não conhece
  // o cabeçalho, e mandá-lo para terceiros seria vazamento à toa.
  const faculdadeId = faculdadeAtiva.faculdadeId;
  if (token && faculdadeId !== null && ehRequisicaoDaApi(req.url)) {
    headers['X-Faculdade-Id'] = String(faculdadeId);
  }

  const cloned = Object.keys(headers).length ? req.clone({ setHeaders: headers }) : req;

  return next(cloned).pipe(
    catchError((error) => {
      if (error.status === 401) {
        faculdadeAtiva.reset();
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};

/**
 * `environment.apiUrl` é absoluto em dev (`http://localhost:8000/api`) e
 * relativo em produção (`/api`) — a checagem cobre os dois formatos.
 */
function ehRequisicaoDaApi(url: string): boolean {
  return url.startsWith(environment.apiUrl) || url.startsWith('/api/');
}
