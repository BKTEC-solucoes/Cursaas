import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { Router } from '@angular/router';

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
  role: 'admin' | 'aluno';
  admin_role?: string | null;
  instituicao_id?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8000/api';
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
    localStorage.removeItem('access_token');
    this.tokenSubject.next(null);
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  private loadUserInfo(): void {
    const token = this.getToken();
    if (token) {
      try {
        const decoded = this.decodeToken(token);
        this.currentUserSubject.next(decoded);
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
  }

  private decodeToken(token: string): UserInfo {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    const payload = JSON.parse(jsonPayload);
    return {
      id: payload.user_id ?? payload.id,
      nome: payload.nome ?? payload.sub,
      email: payload.sub,
      role: payload.role,
      admin_role: payload.admin_role ?? null,
      instituicao_id: payload.instituicao_id ?? null,
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

  register(nome: string, email: string, senha: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.apiUrl}/auth/registro`, {
      nome,
      email,
      senha
    }).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.access_token);
        this.tokenSubject.next(response.access_token);
        this.loadUserInfo();
      })
    );
  }

  registrarInstituicao(dados: {
    nome_instituicao: string;
    cnpj: string;
    email: string;
    nome_responsavel: string;
    contato: string;
    endereco: string;
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
