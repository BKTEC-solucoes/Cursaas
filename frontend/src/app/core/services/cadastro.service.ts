import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FaculdadePublica {
  id: number;
  nome: string;
}

export interface SolicitacaoCadastro {
  id: number;
  nome: string;
  email: string;
  telefone: string | null;
  cpf_rg: string | null;
  mensagem: string | null;
  faculdade_id: number;
  faculdade_nome: string | null;
  status: 'pendente' | 'aprovada' | 'recusada';
  motivo_recusa: string | null;
  usuario_id: number | null;
  criado_em: string;
  revisado_em: string | null;
  revisado_por_id: number | null;
}

@Injectable({ providedIn: 'root' })
export class CadastroService {
  private readonly base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /** Lista faculdades ativas — endpoint público, sem auth */
  getFaculdadesPublicas(): Observable<FaculdadePublica[]> {
    return this.http.get<FaculdadePublica[]>(`${this.base}/faculdades/publicas`);
  }

  // ── Admin ──────────────────────────────────────────────────────────────────

  /** Todas as solicitações (filter: status='pendente'|'aprovada'|'recusada') */
  listarTodas(statusFiltro?: string): Observable<SolicitacaoCadastro[]> {
    const params: Record<string, string> = {};
    if (statusFiltro) params['status'] = statusFiltro;
    return this.http.get<SolicitacaoCadastro[]>(`${this.base}/cadastro/admin/todas`, { params });
  }

  /** Somente pendentes */
  listarPendentes(): Observable<SolicitacaoCadastro[]> {
    return this.http.get<SolicitacaoCadastro[]>(`${this.base}/cadastro/admin/pendentes`);
  }

  /** Aprovar solicitação */
  aprovar(id: number): Observable<SolicitacaoCadastro> {
    return this.http.patch<SolicitacaoCadastro>(`${this.base}/cadastro/admin/${id}/aprovar`, {});
  }

  /** Recusar solicitação */
  recusar(id: number, motivo: string): Observable<SolicitacaoCadastro> {
    return this.http.patch<SolicitacaoCadastro>(
      `${this.base}/cadastro/admin/${id}/recusar`,
      {},
      { params: { motivo } }
    );
  }
}
