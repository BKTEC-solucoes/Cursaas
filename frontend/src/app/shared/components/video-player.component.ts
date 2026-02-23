import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="video-player-container">
      <div class="video-wrapper">
        <video
          #videoElement
          class="video-element"
          controls
          (timeupdate)="onTimeUpdate()"
          (play)="onPlay()"
          (pause)="onPause()"
          (ended)="onEnded()"
        >
          <source [src]="videoUrl" type="video/mp4">
          Seu navegador não suporta vídeo HTML5.
        </video>
      </div>

      <div class="video-info">
        <h3>{{ titulo }}</h3>
        <p *ngIf="descricao">{{ descricao }}</p>
      </div>

      <div class="progress-info">
        <div class="progress-bars">
          <div class="progress-item">
            <label>Assistido:</label>
            <div class="progress-bar">
              <div class="progress-fill" [style.width.%]="percentualAssistido"></div>
            </div>
            <span class="progress-text">{{ percentualAssistido | number:'1.0-0' }}%</span>
          </div>

          <div class="progress-item" *ngIf="percentualAssistido >= 75">
            <div class="attendance-status success">
              <span>✓ Presença Registrada!</span>
            </div>
          </div>

          <div class="progress-item" *ngIf="percentualAssistido < 75">
            <div class="attendance-status warning">
              <span>Assista pelo menos 75% para registrar presença</span>
            </div>
          </div>
        </div>

        <div class="time-info">
          <span>{{ formatTime(tempoAtual) }} / {{ formatTime(duracao) }}</span>
        </div>
      </div>

      <div class="tracking-status">
        <p *ngIf="rastreando" class="tracking-active">📡 Rastreando progresso...</p>
        <p *ngIf="ultimaAtualizacao" class="tracking-info">
          Última atualização: {{ ultimaAtualizacao | date:'short' }}
        </p>
      </div>
    </div>
  `,
  styles: [`
    .video-player-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .video-wrapper {
      position: relative;
      width: 100%;
      background: #000;
    }

    .video-element {
      width: 100%;
      height: auto;
      display: block;
      max-height: 600px;
    }

    .video-info {
      padding: 20px;
      border-bottom: 1px solid #eee;
    }

    .video-info h3 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 18px;
    }

    .video-info p {
      margin: 0;
      color: #666;
      font-size: 14px;
      line-height: 1.5;
    }

    .progress-info {
      padding: 20px;
      background-color: #f9f9f9;
      border-bottom: 1px solid #eee;
    }

    .progress-bars {
      display: flex;
      flex-direction: column;
      gap: 15px;
      margin-bottom: 15px;
    }

    .progress-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .progress-item label {
      font-weight: 600;
      color: #333;
      font-size: 13px;
    }

    .progress-bar {
      height: 8px;
      background-color: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #4CAF50, #45a049);
      transition: width 0.3s ease;
    }

    .progress-text {
      font-size: 12px;
      color: #666;
      font-weight: 600;
    }

    .attendance-status {
      padding: 12px 16px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 14px;
      text-align: center;
    }

    .attendance-status.success {
      background-color: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .attendance-status.warning {
      background-color: #fff3cd;
      color: #856404;
      border: 1px solid #ffeaa7;
    }

    .time-info {
      text-align: right;
      font-size: 13px;
      color: #666;
      font-weight: 500;
    }

    .tracking-status {
      padding: 12px 20px;
      background-color: #f0f7ff;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #555;
    }

    .tracking-status p {
      margin: 5px 0;
    }

    .tracking-active {
      color: #2196F3;
      font-weight: 600;
    }

    .tracking-info {
      color: #999;
    }
  `]
})
export class VideoPlayerComponent implements OnInit, OnDestroy {
  @Input() aulaId!: number;
  @Input() videoUrl!: string;
  @Input() titulo!: string;
  @Input() descricao: string = '';

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  percentualAssistido = 0;
  tempoAtual = 0;
  duracao = 0;
  rastreando = false;
  ultimaAtualizacao: Date | null = null;

  private trackingSubscription?: Subscription;
  private updateInterval = 10000; // 10 segundos
  private alunoId: number | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    const usuario = this.authService.getCurrentUser();
    if (usuario) {
      this.alunoId = usuario.id;
    }
  }

  ngOnInit(): void {
    // Iniciar rastreamento periódico
    this.iniciarRastreamento();
  }

  ngOnDestroy(): void {
    if (this.trackingSubscription) {
      this.trackingSubscription.unsubscribe();
    }
  }

  onTimeUpdate(): void {
    const video = this.videoElement.nativeElement;
    this.tempoAtual = video.currentTime;
    this.duracao = video.duration || 0;

    if (this.duracao > 0) {
      this.percentualAssistido = (this.tempoAtual / this.duracao) * 100;
    }
  }

  onPlay(): void {
    this.rastreando = true;
  }

  onPause(): void {
    this.rastreando = false;
  }

  onEnded(): void {
    this.percentualAssistido = 100;
    this.rastreando = false;
    this.atualizarProgresso();
  }

  private iniciarRastreamento(): void {
    this.trackingSubscription = interval(this.updateInterval).subscribe(() => {
      if (this.rastreando && this.videoElement) {
        this.atualizarProgresso();
      }
    });
  }

  private atualizarProgresso(): void {
    if (!this.videoElement || !this.alunoId || this.duracao <= 0) {
      return;
    }

    const video = this.videoElement.nativeElement;
    const percentualAtual = (video.currentTime / video.duration) * 100;

    // Enviar atualização para o backend
    const apiUrl = 'http://localhost:8000/api';
    this.http.post<any>(
      `${apiUrl}/presenca/${this.alunoId}/${this.aulaId}/atualizar-progresso`,
      {
        percentual_assistido: Math.round(percentualAtual),
        tempo_total_segundos: Math.round(video.duration)
      }
    ).subscribe({
      next: (response: any) => {
        this.ultimaAtualizacao = new Date();
        console.log('Progresso atualizado:', response);
      },
      error: (error: any) => {
        console.error('Erro ao atualizar progresso:', error);
      }
    });
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}
