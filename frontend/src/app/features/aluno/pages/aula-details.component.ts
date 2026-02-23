import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../shared/services/api.service';
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
        <!-- Video Player com Rastreamento -->
        <div class="video-section" *ngIf="videoUrl">
          <app-video-player
            [aulaId]="aulaId"
            [videoUrl]="videoUrl"
            [titulo]="aula.titulo"
            [descricao]="aula.descricao"
          ></app-video-player>
        </div>

        <div class="no-video" *ngIf="!videoUrl">
          <p>Nenhum vídeo disponível para esta aula.</p>
        </div>

        <!-- Descrição da Aula -->
        <div class="aula-description" *ngIf="aula.descricao">
          <h3>Descrição</h3>
          <p>{{ aula.descricao }}</p>
        </div>

        <!-- Informações da Aula -->
        <div class="aula-info">
          <h3>Informações</h3>
          <div class="info-grid">
            <div class="info-item" *ngIf="aula.duracao_minutos">
              <label>Duração:</label>
              <span>{{ aula.duracao_minutos }} minutos</span>
            </div>
            <div class="info-item" *ngIf="aula.curso_id">
              <label>Curso:</label>
              <span>ID {{ aula.curso_id }}</span>
            </div>
            <div class="info-item">
              <label>Status:</label>
              <span class="status-active">Disponível</span>
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
      gap: 30px;
    }

    .video-section {
      width: 100%;
    }

    .no-video {
      background: white;
      border-radius: 8px;
      padding: 40px;
      text-align: center;
      color: #999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .aula-description {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .aula-description h3 {
      margin: 0 0 15px 0;
      color: #333;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }

    .aula-description p {
      margin: 0;
      color: #666;
      line-height: 1.6;
    }

    .aula-info {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .aula-info h3 {
      margin: 0 0 15px 0;
      color: #333;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
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

    .status-active {
      background-color: #d4edda;
      color: #155724;
      padding: 4px 8px;
      border-radius: 4px;
      display: inline-block;
      width: fit-content;
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
  aulaId: any;
  aula: any;
  videoUrl: string = '';
  erro: string = '';

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.aulaId = params['id'];
      if (this.aulaId) {
        this.carregarAula();
      }
    });
  }

  carregarAula(): void {
    this.apiService.getAula(this.aulaId).subscribe({
      next: (aula) => {
        this.aula = aula;
        // Se houver vídeos, usar o primeiro
        if (aula.videos && aula.videos.length > 0) {
          const video = aula.videos[0];
          // Extrair apenas o nome do arquivo do caminho completo
          const nomeArquivo = video.caminho_arquivo.split('\\').pop() || video.arquivo_nome;
          this.videoUrl = `http://localhost:8000/api/aulas/video/${nomeArquivo}`;
        }
      },
      error: (error) => {
        console.error('Erro ao carregar aula:', error);
        this.erro = 'Erro ao carregar aula. Tente novamente.';
      }
    });
  }
}

