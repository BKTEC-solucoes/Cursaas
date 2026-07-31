import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, map, tap, catchError, shareReplay, skip } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface FaculdadeResumo {
  id: number;
  nome: string;
  slug?: string;
  ativa?: boolean;
}

interface FaculdadePage {
  items: FaculdadeResumo[];
  total: number;
}

/** Chave do localStorage — sobrevive ao reload, some no logout. */
const STORAGE_KEY = 'faculdade_ativa_id';

/**
 * Instituição que o super admin está gerenciando no momento.
 *
 * Super admin não tem `faculdade_id` próprio: sem escopo, o backend devolve
 * cursos, aulas e alunos de TODOS os tenants misturados, e criar qualquer coisa
 * exige informar o tenant no payload. Este serviço fixa uma faculdade por vez;
 * o `authInterceptor` a envia em `X-Faculdade-Id` e o `TenantContext` do backend
 * passa a filtrar por ela.
 *
 * Para admins comuns o serviço fica inerte: o tenant já vem do vínculo do
 * usuário e o cabeçalho não é enviado.
 */
@Injectable({ providedIn: 'root' })
export class FaculdadeAtivaService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly api = environment.apiUrl;

  private readonly idSubject = new BehaviorSubject<number | null>(this.lerDoStorage());
  /** Id da faculdade em gestão, ou null (admin comum / nenhuma selecionada). */
  readonly faculdadeId$ = this.idSubject.asObservable();

  private readonly listaSubject = new BehaviorSubject<FaculdadeResumo[]>([]);
  readonly faculdades$ = this.listaSubject.asObservable();

  /** Requisição em voo, compartilhada — evita N chamadas na montagem do layout. */
  private listaEmCache$: Observable<FaculdadeResumo[]> | null = null;

  constructor() {
    // Troca de sessão zera o escopo. Sem isto, logar como admin de outra
    // instituição na mesma aba manteria o id antigo em memória e o backend
    // devolveria 403 em toda requisição. `skip(1)` ignora a emissão inicial,
    // que é apenas o token já existente no boot.
    this.auth.token$.pipe(skip(1)).subscribe(() => this.reset());
  }

  get faculdadeId(): number | null {
    return this.idSubject.value;
  }

  get faculdades(): FaculdadeResumo[] {
    return this.listaSubject.value;
  }

  /** Nome da faculdade ativa, para exibir no cabeçalho. */
  get nomeAtual(): string | null {
    const id = this.faculdadeId;
    if (id === null) return null;
    return this.listaSubject.value.find(f => f.id === id)?.nome ?? null;
  }

  /** True apenas para super admin — só ele escolhe o tenant que gerencia. */
  ehSuperAdmin(): boolean {
    const user = this.auth.getCurrentUser();
    return user?.role === 'admin' && user?.admin_role === 'super_admin';
  }

  selecionar(faculdadeId: number): void {
    localStorage.setItem(STORAGE_KEY, String(faculdadeId));
    this.idSubject.next(faculdadeId);
  }

  /** Volta à visão global (todos os tenants). */
  limparSelecao(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.idSubject.next(null);
  }

  /** Descarta lista e seleção — chamado no logout. */
  reset(): void {
    this.listaEmCache$ = null;
    this.listaSubject.next([]);
    this.limparSelecao();
  }

  /**
   * Lista as faculdades ativas que o super admin pode gerenciar.
   * O resultado é memoizado; use `recarregarFaculdades()` após criar uma nova.
   */
  carregarFaculdades(): Observable<FaculdadeResumo[]> {
    if (!this.listaEmCache$) {
      this.listaEmCache$ = this.http
        .get<FaculdadePage>(`${this.api}/faculdades/`, {
          params: { page: 1, limit: 100, ativa: true },
        })
        .pipe(
          map(res => res.items ?? []),
          tap(items => this.listaSubject.next(items)),
          catchError(() => {
            // Sem lista não há como escolher: segue em visão global.
            this.listaSubject.next([]);
            return of([] as FaculdadeResumo[]);
          }),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }
    return this.listaEmCache$;
  }

  recarregarFaculdades(): Observable<FaculdadeResumo[]> {
    this.listaEmCache$ = null;
    return this.carregarFaculdades();
  }

  /**
   * Garante que existe uma faculdade selecionada antes de abrir uma tela de
   * gestão. Se a seleção salva não existe mais (faculdade desativada/removida),
   * cai para a primeira da lista.
   *
   * Devolve o id escolhido, ou null quando não há nenhuma faculdade disponível.
   */
  garantirSelecao(): Observable<number | null> {
    if (!this.ehSuperAdmin()) return of(null);

    return this.carregarFaculdades().pipe(
      map(faculdades => {
        if (faculdades.length === 0) {
          this.limparSelecao();
          return null;
        }

        const atual = this.faculdadeId;
        if (atual !== null && faculdades.some(f => f.id === atual)) {
          return atual;
        }

        this.selecionar(faculdades[0].id);
        return faculdades[0].id;
      }),
    );
  }

  private lerDoStorage(): number | null {
    const bruto = localStorage.getItem(STORAGE_KEY);
    if (!bruto) return null;
    const id = Number(bruto);
    return Number.isInteger(id) && id > 0 ? id : null;
  }
}
