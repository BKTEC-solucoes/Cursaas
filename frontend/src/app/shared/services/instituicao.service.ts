import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

export interface InstituicaoCreate {
  nome_instituicao: string;
  cnpj: string;
  email: string;
  nome_responsavel?: string;
  contato: string;
  endereco: string;
  senha: string;
}

export interface InstituicaoResponse {
  id: number;
  nome_instituicao: string;
  cnpj: string;
  contato: string;
  endereco: string;
  ativo: boolean;
  aprovada: boolean;
  motivo_rejeicao?: string;
  observacoes?: string;
  data_criacao: string;
  data_atualizacao?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  usuario: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class InstituicaoService {
  private apiUrl = `${environment.apiUrl}/instituicoes`;

  constructor(private http: HttpClient) {}

  registrarInstituicao(dados: InstituicaoCreate): Observable<TokenResponse> {
    const dadosFormatados = {
      ...dados,
      cnpj: this.formatarCNPJ(dados.cnpj),
      email: dados.email.toLowerCase().trim(),
      contato: dados.contato.trim(),
      endereco: dados.endereco.trim(),
      nome_instituicao: dados.nome_instituicao.trim(),
      nome_responsavel: dados.nome_responsavel?.trim()
    };

    return this.http.post<TokenResponse>(`${this.apiUrl}/registrar`, dadosFormatados).pipe(
      tap((response) => {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('usuario', JSON.stringify(response.usuario));
      }),
      catchError(this.handleError)
    );
  }

  formatarCNPJ(cnpj: string): string {
    const limpo = cnpj.replace(/\D/g, '');

    if (limpo.length !== 14) {
      throw new Error(`CNPJ deve ter 14 dígitos. Recebido: ${limpo.length}`);
    }

    return `${limpo.slice(0, 2)}.${limpo.slice(2, 5)}.${limpo.slice(5, 8)}/${limpo.slice(8, 12)}-${limpo.slice(12, 14)}`;
  }

  obterInstituicao(id: number): Observable<InstituicaoResponse> {
    return this.http.get<InstituicaoResponse>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let mensagem = 'Erro ao processar requisição';

    if (error.error instanceof ErrorEvent) {
      mensagem = error.error.message;
    } else if (error.status === 400) {
      mensagem = error.error?.detail || 'Dados inválidos';
    } else if (error.status === 404) {
      mensagem = 'Recurso não encontrado';
    } else if (error.status === 500) {
      mensagem = 'Erro interno do servidor';
    }

    console.error('Erro:', mensagem, error);
    return throwError(() => new Error(mensagem));
  }
}
