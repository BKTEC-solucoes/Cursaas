import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export type CourseRequestStatus = 'pending' | 'approved' | 'rejected';

export interface CourseRequest {
  id: number;
  usuario_id: number;
  curso_id: number;
  status: CourseRequestStatus;
  created_at: string;
  updated_at: string;
  usuario_nome?: string | null;
  usuario_email?: string | null;
  curso_nome?: string | null;
  curso_pago?: boolean | null;
}

export interface AdminCourse {
  id: number;
  nome: string;
  descricao?: string | null;
  pago: boolean;
  valor?: number | null;
  status: 'pendente' | 'aprovado' | 'recusado';
  percentual_presenca_minima: number;
  ativo: boolean;
  data_criacao: string;
  data_atualizacao?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  // Cursos
  getCursos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/cursos/`).pipe(
      catchError((error) => {
        console.error('Erro ao buscar cursos:', error);
        return of([]);
      })
    );
  }

  getCurso(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/cursos/${id}`).pipe(
      catchError((error) => {
        console.error(`Erro ao buscar curso ${id}:`, error);
        return of(null);
      })
    );
  }

  createCurso(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/cursos/`, data);
  }

  getAdminCursos(): Observable<AdminCourse[]> {
    return this.http.get<AdminCourse[]>(`${this.apiUrl}/admin/cursos`);
  }

  updateCurso(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/cursos/${id}`, data);
  }

  deleteCurso(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/cursos/${id}`);
  }

  inscreverCurso(cursoId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/cursos/${cursoId}/inscrever`, {});
  }

  getCursosAluno(alunoId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/alunos/${alunoId}/cursos/`).pipe(
      catchError((error) => {
        console.error(`Erro ao buscar cursos do aluno ${alunoId}:`, error);
        return of([]);
      })
    );
  }

  // Aulas
  getAulas(cursoId?: number): Observable<any[]> {
    let params = new HttpParams();
    if (cursoId) {
      params = params.set('curso_id', cursoId.toString());
    }
    return this.http.get<any[]>(`${this.apiUrl}/aulas/`, { params }).pipe(
      catchError((error) => {
        console.error('Erro ao buscar aulas:', error);
        return of([]);
      })
    );
  }

  getAula(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/aulas/${id}`).pipe(
      catchError((error) => {
        console.error(`Erro ao buscar aula ${id}:`, error);
        return of(null);
      })
    );
  }

  createAula(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/aulas/`, data);
  }

  updateAula(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/aulas/${id}`, data);
  }

  deleteAula(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/aulas/${id}`);
  }

  // Provas
  getProvas(cursoId?: number): Observable<any[]> {
    let params = new HttpParams();
    if (cursoId) {
      params = params.set('curso_id', cursoId.toString());
    }
    return this.http.get<any[]>(`${this.apiUrl}/provas/`, { params }).pipe(
      catchError((error) => {
        console.error('Erro ao buscar provas:', error);
        return of([]);
      })
    );
  }

  getProva(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/provas/${id}`).pipe(
      catchError((error) => {
        console.error(`Erro ao buscar prova ${id}:`, error);
        return of(null);
      })
    );
  }

  submitProva(provaId: number, respostas: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/provas/${provaId}/responder`, { respostas });
  }

  getMeuResultado(provaId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/provas/${provaId}/meu-resultado`);
  }

  getMinhasRespostasDetalhadas(provaId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/provas/${provaId}/minhas-respostas-detalhadas`);
  }

  // Notas
  getNotas(alunoId?: number): Observable<any[]> {
    let url = `${this.apiUrl}/notas`;
    if (alunoId) {
      url += `/${alunoId}`;
    }
    return this.http.get<any[]>(url).pipe(
      catchError((error) => {
        console.error('Erro ao buscar notas:', error);
        return of([]);
      })
    );
  }

  getNotaCurso(alunoId: number, cursoId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/notas/aluno/${alunoId}/curso/${cursoId}`).pipe(
      catchError((error) => {
        console.error(`Erro ao buscar nota do curso ${cursoId}:`, error);
        return of(null);
      })
    );
  }

  // Presença
  getPresenca(alunoId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/presenca/${alunoId}`).pipe(
      catchError((error) => {
        console.error(`Erro ao buscar presença do aluno ${alunoId}:`, error);
        return of([]);
      })
    );
  }

  updatePresenca(alunoId: number, aulaId: number, data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/presenca/${alunoId}/${aulaId}/atualizar-progresso`, data);
  }

  // Solicitações de acesso
  createCourseRequest(cursoId: number): Observable<CourseRequest> {
    return this.http.post<CourseRequest>(`${this.apiUrl}/requests/`, { curso_id: cursoId });
  }

  getCourseRequests(status?: CourseRequestStatus): Observable<CourseRequest[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<CourseRequest[]>(`${this.apiUrl}/requests/`, { params }).pipe(
      catchError((error) => {
        console.error('Erro ao buscar solicitações:', error);
        return of([]);
      })
    );
  }

  getCourseRequestStatus(cursoId: number): Observable<CourseRequest | null> {
    return this.http.get<CourseRequest | null>(`${this.apiUrl}/requests/me/${cursoId}`).pipe(
      catchError((error) => {
        console.error(`Erro ao buscar solicitação do curso ${cursoId}:`, error);
        return of(null);
      })
    );
  }

  updateCourseRequestStatus(requestId: number, requestStatus: CourseRequestStatus): Observable<CourseRequest> {
    return this.http.patch<CourseRequest>(`${this.apiUrl}/requests/${requestId}`, { status: requestStatus });
  }

  getAdminCourseApprovals(): Observable<AdminCourse[]> {
    return this.http.get<AdminCourse[]>(`${this.apiUrl}/admin/solicitacoes`);
  }

  approveAdminCourse(cursoId: number): Observable<AdminCourse> {
    return this.http.post<AdminCourse>(`${this.apiUrl}/admin/solicitacoes/${cursoId}/aprovar`, {});
  }

  rejectAdminCourse(cursoId: number): Observable<AdminCourse> {
    return this.http.post<AdminCourse>(`${this.apiUrl}/admin/solicitacoes/${cursoId}/recusar`, {});
  }
}
