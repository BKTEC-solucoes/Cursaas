import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ---------------------------------------------------------------------------
// Modelos
// ---------------------------------------------------------------------------

export interface Curso {
  id: number;
  nome: string;
  descricao: string | null;
  pago: boolean;
  valor: number | null;
  status: 'pendente' | 'aprovado' | 'recusado';
  ativo: boolean;
  faculdade_id: number | null;
  percentual_presenca_minima: number;
  data_criacao: string;
  data_atualizacao: string | null;
}

export interface Video {
  id: number;
  url: string;
  titulo: string | null;
}

export interface Aula {
  id: number;
  curso_id: number;
  curso_nome: string | null;
  titulo: string;
  descricao: string | null;
  data_aula: string;
  duracao_minutos: number | null;
  ativo: boolean;
  blocos: any[] | null;
  videos: Video[];
}

export interface Prova {
  id: number;
  titulo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string;
  tentativas_permitidas: number;
  total_questoes: number;
  ativo: boolean;
}

/** Curso em que o aluno está matriculado — vem com aulas e provas embutidas. */
export interface CursoInscrito extends Curso {
  aulas: Aula[];
  provas: Prova[];
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * CursosService — consome os endpoints /cursos e /cursos/{id}/aulas.
 *
 * O token JWT é injetado automaticamente pelo `authInterceptor`
 * (core/interceptors/auth.interceptor.ts) em todas as requisições.
 * Não é necessário setar headers manualmente.
 *
 * Uso:
 *   constructor(private cursosService: CursosService) {}
 *
 *   this.cursosService.getCursos().subscribe(cursos => ...);
 *   this.cursosService.getAulas(3).subscribe(aulas => ...);
 */
@Injectable({ providedIn: 'root' })
export class CursosService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Lista os cursos ativos da faculdade do usuário autenticado.
   * O backend aplica o filtro de tenant via faculdade_id do JWT — nenhum
   * parâmetro extra é necessário.
   *
   * GET /cursos/
   */
  getCursos(): Observable<Curso[]> {
    return this.http.get<Curso[]>(`${this.api}/cursos/`);
  }

  /**
   * Busca os detalhes de um curso específico.
   * Retorna 403 se o curso pertencer a outro tenant.
   *
   * GET /cursos/{cursoId}
   */
  getCurso(cursoId: number): Observable<Curso> {
    return this.http.get<Curso>(`${this.api}/cursos/${cursoId}`);
  }

  /**
   * Lista as aulas ativas de um curso.
   * Valida no backend se o curso pertence à faculdade do usuário (403 se não).
   *
   * GET /cursos/{cursoId}/aulas
   */
  getAulas(cursoId: number): Observable<Aula[]> {
    return this.http.get<Aula[]>(`${this.api}/cursos/${cursoId}/aulas`);
  }

  /**
   * Lista os cursos em que o aluno está efetivamente **inscrito**, já com
   * `aulas` e `provas` embutidas.
   *
   * Difere de `getCursos()`, que devolve o catálogo inteiro da faculdade —
   * usar aquele em "Meus Cursos" mostrava cursos sem matrícula e, pior,
   * devolvia lista vazia para aluno sem vínculo ativo.
   *
   * GET /alunos/{alunoId}/cursos
   */
  getCursosDoAluno(alunoId: number): Observable<CursoInscrito[]> {
    return this.http.get<CursoInscrito[]>(`${this.api}/alunos/${alunoId}/cursos`);
  }
}
