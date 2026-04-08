import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoUploadComponent, Video } from './video-upload.component';

/**
 * Componente wrapper que integra o VideoUploadComponent com o sistema de blocos
 * do aula-form. Gerencia múltiplos vídeos (YouTube e uploads).
 */
@Component({
  selector: 'app-bloco-video-moderno',
  standalone: true,
  imports: [CommonModule, VideoUploadComponent],
  template: `
    <div class="bloco-video-moderno">
      <app-video-upload
        [aulaId]="aulaId"
        [videosIniciais]="videos"
        (videosAdicionados)="onVideosAdicionados($event)"
        (videoRemovido)="onVideoRemovido()"
      ></app-video-upload>
    </div>
  `,
  styles: [`
    .bloco-video-moderno {
      width: 100%;
    }
  `]
})
export class BlocoVideoModernoComponent implements OnInit, OnChanges {
  @Input() aulaId?: number;
  @Input() conteudo = '';
  @Output() conteudoChange = new EventEmitter<string>();

  videos: Video[] = [];
  private interagido = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['conteudo'] && !this.interagido) {
      this.parseConteudo();
    }
  }

  ngOnInit(): void {
    if (!this.interagido) {
      this.parseConteudo();
    }
  }

  private parseConteudo(): void {
    if (!this.conteudo) return;
    try {
      const parsed = JSON.parse(this.conteudo);
      if (Array.isArray(parsed)) {
        this.videos = parsed;
      }
    } catch (e) {
      console.warn('Erro ao fazer parse de conteúdo de vídeos:', e);
    }
  }

  onVideosAdicionados(videos: Video[]): void {
    this.interagido = true;
    this.videos = videos;
    // Armazena como JSON
    this.conteudoChange.emit(JSON.stringify(videos));
  }

  onVideoRemovido(): void {
    this.conteudoChange.emit(JSON.stringify(this.videos));
  }
}
