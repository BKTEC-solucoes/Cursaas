import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { ApiService, CourseRequest } from '../../../shared/services/api.service';
import { VideoPlayerComponent } from '../../../shared/components';

@Component({
  selector: 'app-aula-details',
  standalone: true,
  imports: [CommonModule, VideoPlayerComponent],
  template: `
    <div class="page-container">
      <div class="aula-header">
        <h2>{{ aula?.titulo || 'Carregando...' }}</h2>
        <p class="aula-date" *ngIf="aula?.data_aula">
          {{ aula.data_aula | date:'dd/MM/yyyy HH:mm' }}
        </p>
      </div>

      <div class="aula-content" *ngIf="aula">
        <div class="access-status access-loading" *ngIf="carregandoAcesso">
          <p>Verificando acesso ao curso...</p>
        </div>

        <div class="access-panel" *ngIf="!carregandoAcesso && curso?.pago && !acessoLiberado">
          <h3>Curso pago</h3>
          <p>{{ mensagemAcesso }}</p>
          <button
            class="btn-request"
            *ngIf="podeSolicitarAcesso()"
            (click)="solicitarAcesso()"
            [disabled]="processandoSolicitacao"
          >
            {{ processandoSolicitacao ? 'Enviando solicitação...' : getTextoBotaoSolicitacao() }}
          </button>
        </div>

        <div class="access-status access-approved" *ngIf="!carregandoAcesso && curso?.pago && acessoLiberado">
          <p>Sua solicitação foi aprovada. O vídeo está liberado.</p>
        </div>

        <div class="video-section" *ngIf="videoUrl && acessoLiberado">
          <app-video-player
            [aulaId]="aulaId || 0"
            [videoUrl]="videoUrl"
            [titulo]="aula.titulo"
            [descricao]="aula.descricao"
          ></app-video-player>
        </div>

        <div class="no-video" *ngIf="!videoUrl && acessoLiberado">
          <p>Nenhum vídeo disponível para esta aula.</p>
        </div>

        <div class="aula-description" *ngIf="aula.descricao">
          <h3>Descrição</h3>
          <p>{{ aula.descricao }}</p>
        </div>

        <div class="aula-info">
          <h3>Informações</h3>
          <div class="info-grid">
            <div class="info-item" *ngIf="aula.duracao_minutos">
              <label>Duração:</label>
              <span>{{ aula.duracao_minutos }} minutos</span>
            </div>
            <div class="info-item" *ngIf="aula.curso_id">
              <label>Curso:</label>
              <span>{{ curso?.nome || ('ID ' + aula.curso_id) }}</span>
            </div>
            <div class="info-item">
              <label>Status:</label>
              <span class="status-active" *ngIf="acessoLiberado">Disponível</span>
              <span class="status-waiting" *ngIf="!acessoLiberado">Aguardando liberação</span>
            </div>
          </div>
        </div>
      </div>

      <div class="loading" *ngIf="!aula">
        <p>Carregando aula...</p>
      </div>

      <div class="error" *ngIf="erro">
        <p>{{ erro }}</p>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1000px;
      margin: 0 auto;
    }

    .aula-header {
      margin-bottom: 30px;
      border-bottom: 2px solid #eee;
      padding-bottom: 15px;
    }

    .aula-header h2 {
      margin: 0 0 10px 0;
      color: #333;
    }

    .aula-date {
      color: #999;
      font-size: 14px;
      margin: 0;
    }

    .aula-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .access-status,
    .access-panel,
    .no-video,
    .aula-description,
    .aula-info {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .access-loading {
      color: #475467;
    }

    .access-approved {
      border-left: 4px solid #16a34a;
      color: #166534;
      background: #f0fdf4;
    }

    .access-panel {
      border-left: 4px solid #d97706;
      background: #fffbeb;
    }

    .access-panel h3,
    .aula-description h3,
    .aula-info h3 {
      margin: 0 0 12px 0;
      color: #333;
    }

    .btn-request {
      margin-top: 12px;
      background: #d97706;
      color: white;
      border: none;
      padding: 10px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
    }

    .btn-request:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .video-section {
      width: 100%;
    }

    .no-video {
      text-align: center;
      color: #999;
    }

    .aula-description p {
      margin: 0;
      color: #666;
      line-height: 1.6;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .info-item label {
      font-weight: 600;
      color: #666;
      font-size: 12px;
    }

    .info-item span {
      color: #333;
      font-size: 14px;
    }

    .status-active,
    .status-waiting {
      padding: 4px 8px;
      border-radius: 4px;
      display: inline-block;
      width: fit-content;
    }

    .status-active {
      background-color: #d4edda;
      color: #155724;
    }

    .status-waiting {
      background: #fff3cd;
      color: #856404;
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: #999;
    }

    .error {
      background-color: #f8d7da;
      color: #721c24;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
      border: 1px solid #f5c6cb;
    }
  `]
})
export class AulaDetailsComponent implements OnInit {
  aulaId: number | null = null;
  aula: any;
  curso: any;
  solicitacao: CourseRequest | null = null;
  videoUrl = '';
  erro = '';
  mensagemAcesso = '';
  acessoLiberado = false;
  carregandoAcesso = false;
  processandoSolicitacao = false;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const id = Number(params['id']);
      this.aulaId = Number.isNaN(id) ? null : id;
      if (this.aulaId) {
        this.carregarAula();
      }
    });
  }

  carregarAula(): void {
    if (!this.aulaId) {
      return;
    }

    this.apiService.getAula(this.aulaId).subscribe({
      next: (aula) => {
        if (!aula) {
          this.erro = 'Aula não encontrada.';
          return;
        }

        this.aula = aula;

        if (aula.videos && aula.videos.length > 0) {
          const video = aula.videos[0];
          const nomeArquivo = video.caminho_arquivo.split('\\').pop() || video.arquivo_nome;
          this.videoUrl = `http://localhost:8000/api/aulas/video/${nomeArquivo}`;
        }

        this.verificarAcessoCurso();
      },
      error: (error) => {
        console.error('Erro ao carregar aula:', error);
        this.erro = 'Erro ao carregar aula. Tente novamente.';
      }
    });
  }

  verificarAcessoCurso(): void {
    if (!this.aula?.curso_id) {
      this.acessoLiberado = true;
      return;
    }

    this.carregandoAcesso = true;
    this.apiService.getCurso(this.aula.curso_id).subscribe({
      next: (curso) => {
        this.curso = curso;

        if (!curso?.pago) {
          this.acessoLiberado = true;
          this.mensagemAcesso = '';
          this.carregandoAcesso = false;
          return;
        }

        this.apiService.getCourseRequestStatus(this.aula.curso_id).subscribe({
          next: (solicitacao) => {
            this.solicitacao = solicitacao;
            this.definirEstadoAcesso();
            this.carregandoAcesso = false;
          },
          error: () => {
            this.solicitacao = null;
            this.definirEstadoAcesso();
            this.carregandoAcesso = false;
          }
        });
      },
      error: () => {
        this.carregandoAcesso = false;
        this.erro = 'Erro ao verificar o acesso ao curso.';
      }
    });
  }

  solicitarAcesso(): void {
    if (!this.aula?.curso_id || this.processandoSolicitacao) {
      return;
    }

    this.processandoSolicitacao = true;
    this.erro = '';

    this.apiService.createCourseRequest(this.aula.curso_id).subscribe({
      next: (solicitacao) => {
        this.solicitacao = solicitacao;
        this.definirEstadoAcesso();
        this.processandoSolicitacao = false;
      },
      error: (error) => {
        this.processandoSolicitacao = false;
        this.erro = error?.error?.detail || 'Não foi possível registrar a solicitação.';
      }
    });
  }

  podeSolicitarAcesso(): boolean {
    return !this.solicitacao || this.solicitacao.status === 'rejected';
  }

  getTextoBotaoSolicitacao(): string {
    return this.solicitacao?.status === 'rejected' ? 'Solicitar novamente' : 'Solicitar acesso';
  }

  private definirEstadoAcesso(): void {
    const status = this.solicitacao?.status;

    if (status === 'approved') {
      this.acessoLiberado = true;
      this.mensagemAcesso = 'Sua solicitação foi aprovada. O vídeo está liberado.';
      return;
    }

    this.acessoLiberado = false;

    if (status === 'pending') {
      this.mensagemAcesso = 'Aguardando aprovação do administrador.';
      return;
    }

    if (status === 'rejected') {
      this.mensagemAcesso = 'Sua solicitação foi recusada. Você pode solicitar novamente.';
      return;
    }

    this.mensagemAcesso = 'Este curso é pago. Solicite acesso para liberar o conteúdo.';
  }
}
