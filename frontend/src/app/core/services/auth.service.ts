import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  usuario?: UserInfo;
}

export interface UserInfo {
  id: number;
  nome: string;
  email: string;
  role: 'admin' | 'aluno' | 'instituicao';
  admin_role?: string | null;
  instituicao_id?: number | null;
  faculdade_id?: number | null;
}

export interface GoogleLoginResponse {
  token: string;
  user: {
    email: string;
    name: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private googleAuthUrl = environment.googleAuthBackendUrl;
  private currentUserSubject = new BehaviorSubject<UserInfo | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private tokenSubject = new BehaviorSubject<string | null>(this.getToken());
  public token$ = this.tokenSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.loadUserInfo();
  }

  login(email: string, password: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.apiUrl}/auth/login`, {
      email,
      senha: password
    }).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.access_token);
        this.tokenSubject.next(response.access_token);
        this.loadUserInfo();
      })
    );
  }

  logout(): void {
    this.limparSessao();
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /**
   * True apenas se existe token E ele ainda não expirou.
   *
   * Checar só a presença do token — como era antes — deixava o authGuard
   * liberar a rota com token vencido: a tela montava, cada request tomava 401 e
   * o interceptor deslogava no meio da navegação. Ler o `exp` corta isso antes.
   *
   * Isto é conveniência de UX, não segurança: quem manda é a validação no
   * backend. O payload do JWT é legível por qualquer um e não é verificado aqui.
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    if (this.isTokenExpirado(token)) {
      this.limparSessao();
      return false;
    }
    return true;
  }

  /** Lê o claim `exp` (segundos desde a epoch). Token ilegível conta como expirado. */
  private isTokenExpirado(token: string): boolean {
    try {
      const partes = token.split('.');
      if (partes.length !== 3) return true;

      const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      if (typeof payload.exp !== 'number') return false; // sem exp: deixa o backend decidir

      return payload.exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  }

  /** Limpa o estado local sem redirecionar (logout() faz o redirect). */
  private limparSessao(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('tenant_theme');
    this.tokenSubject.next(null);
    this.currentUserSubject.next(null);
  }

  private loadUserInfo(): void {
    const token = this.getToken();
    if (token) {
      try {
        const decoded = this.decodeToken(token);
        this.currentUserSubject.next(decoded);
      } catch (error) {
        console.error('Error decoding token:', error);
        // Token inválido, limpar do localStorage
        this.limparSessao();
      }
    }
  }

  private decodeToken(token: string): UserInfo {
    // Validar se o token é um JWT válido com 3 partes
    if (!token || typeof token !== 'string') {
      throw new Error('Token inválido: não é uma string');
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Token inválido: não é um JWT válido');
    }

    const base64Url = parts[1];
    if (!base64Url) {
      throw new Error('Token inválido: payload vazio');
    }

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    const payload = JSON.parse(jsonPayload);
    return {
      id: payload.user_id ?? payload.id,
      nome: payload.nome ?? payload.name ?? payload.sub,
      email: payload.email ?? payload.sub,
      role: payload.role ?? 'aluno',
      admin_role: payload.admin_role ?? null,
      instituicao_id: payload.instituicao_id ?? null,
      faculdade_id: payload.faculdade_id ?? null,
    };
  }

  getCurrentUser(): UserInfo | null {
    return this.currentUserSubject.value;
  }

  hasRole(role: string | string[]): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(user.role);
  }

  register(nome: string, email: string, senha: string, faculdade_id?: number): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.apiUrl}/auth/registro`, {
      nome,
      email,
      senha,
      ...(faculdade_id !== undefined ? { faculdade_id } : {})
    }).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.access_token);
        this.tokenSubject.next(response.access_token);
        this.loadUserInfo();
      })
    );
  }

  loginWithGoogle(idToken: string): Observable<GoogleLoginResponse> {
    return this.http.post<GoogleLoginResponse>(this.googleAuthUrl, {
      token: idToken
    }).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.token);
        this.tokenSubject.next(response.token);
        this.loadUserInfo();
      })
    );
  }

  registrarInstituicao(dados: {
    nome_instituicao: string;
    cnpj: string;
    email: string;
    endereco: string;
    contato: string;
    nome_responsavel?: string;
    senha: string;
  }): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.apiUrl}/instituicoes/registrar`, dados).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.access_token);
        this.tokenSubject.next(response.access_token);
        this.loadUserInfo();
      })
    );
  }

  checkEmailAvailability(email: string): Observable<{ disponivel: boolean; email: string }> {
    return this.http.get<{ disponivel: boolean; email: string }>(
      `${this.apiUrl}/auth/check-email/${email}`
    );
  }
}
