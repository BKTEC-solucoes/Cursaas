import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  // Cursos
  getCursos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/cursos`);
  }

  getCurso(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/cursos/${id}`);
  }

  createCurso(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/cursos`, data);
  }

  updateCurso(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/cursos/${id}`, data);
  }

  deleteCurso(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/cursos/${id}`);
  }

  // Aulas
  getAulas(cursoId?: number): Observable<any[]> {
    let params = new HttpParams();
    if (cursoId) {
      params = params.set('curso_id', cursoId.toString());
    }
    return this.http.get<any[]>(`${this.apiUrl}/aulas`, { params });
  }

  getAula(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/aulas/${id}`);
  }

  createAula(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/aulas`, data);
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
    return this.http.get<any[]>(`${this.apiUrl}/provas`, { params });
  }

  getProva(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/provas/${id}`);
  }

  submitProva(id: number, respostas: any[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/provas/${id}/responder`, { respostas });
  }

  // Notas
  getNotas(alunoId?: number): Observable<any[]> {
    let url = `${this.apiUrl}/notas`;
    if (alunoId) {
      url += `/${alunoId}`;
    }
    return this.http.get<any[]>(url);
  }

  getNotaCurso(alunoId: number, cursoId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/notas/aluno/${alunoId}/curso/${cursoId}`);
  }

  // Presença
  getPresenca(alunoId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/presenca/${alunoId}`);
  }

  updatePresenca(alunoId: number, aulaId: number, data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/presenca/${alunoId}/${aulaId}/atualizar-progresso`, data);
  }
}
