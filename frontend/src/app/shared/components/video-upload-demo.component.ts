import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoUploadComponent, Video } from './video-upload.component';
import { IconComponent } from './icon.component';

/**
 * COMPONENTE DEMO/SHOWCASE
 * 
 * Use este componente para testar e demonstrar o VideoUploadComponent
 * Ele mostra todos os recursos e comportamentos esperados.
 * 
 * Rota sugerida: /admin/demo/video-upload
 */
@Component({
  selector: 'app-video-upload-demo',
  standalone: true,
  imports: [CommonModule, VideoUploadComponent, IconComponent],
  styleUrls: ['./video-upload-demo.component.css'],
  template: `
    <div class="demo-container">
      <header class="demo-header">
        <h1>Demonstração - Video Upload Component</h1>
        <p>Teste todos os recursos do novo componente de upload de vídeo</p>
      </header>

      <div class="demo-content">
        <!-- Seção: Visão Geral -->
        <section class="demo-section">
          <h2>Visão Geral</h2>
          <div class="features-grid">
            <div class="feature-card">
              <span class="feature-icon"><app-icon name="monitor" /></span>
              <h3>YouTube</h3>
              <p>Colar link do YouTube com validação em tempo real</p>
            </div>
            <div class="feature-card">
              <span class="feature-icon"><app-icon name="folder" /></span>
              <h3>Upload Local</h3>
              <p>Drag-and-drop ou selecionar arquivo</p>
            </div>
            <div class="feature-card">
              <span class="feature-icon"><app-icon name="target" /></span>
              <h3>Múltiplos Vídeos</h3>
              <p>Adicione vários vídeos na mesma aula</p>
            </div>
            <div class="feature-card">
              <span class="feature-icon"><app-icon name="zap" /></span>
              <h3>Progresso em Tempo Real</h3>
              <p>Barra de progresso e feedback do upload</p>
            </div>
          </div>
        </section>

        <!-- Seção: Component Demo -->
        <section class="demo-section">
          <h2>Componente em Ação</h2>
          <div class="component-wrapper">
            <app-video-upload
              [aulaId]="1"
              (videosAdicionados)="onVideosAdicionados(\$event)"
              (videoRemovido)="onVideoRemovido()"
            ></app-video-upload>
          </div>
        </section>

        <!-- Seção: Estado -->
        <section class="demo-section">
          <h2>Estado Atual</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-label">Vídeos Adicionados</span>
              <span class="stat-value">{{ videosAdicionados.length }}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">YouTube</span>
              <span class="stat-value">{{ videosYoutube }}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Uploads</span>
              <span class="stat-value">{{ videosUploads }}</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Tamanho Total</span>
              <span class="stat-value">{{ tamanhoTotal }}</span>
            </div>
          </div>
        </section>

        <!-- Seção: Vídeos Debug -->
        <section class="demo-section" *ngIf="videosAdicionados.length > 0">
          <h2>Debug - Dados dos Vídeos</h2>
          <div class="debug-box">
            <pre>{{ videosAdicionados | json }}</pre>
          </div>
        </section>

        <!-- Seção: Instruções -->
        <section class="demo-section">
          <h2>Como Usar</h2>
          <div class="instructions">
            <div class="instruction-item">
              <h3>1. YouTube</h3>
              <ul>
                <li>Clique na aba "Link do YouTube"</li>
                <li>Cole um link válido (youtube.com/watch?v=... ou youtu.be/...)</li>
                <li>Clique "Adicionar"</li>
                <li>Veja o preview com thumbnail</li>
              </ul>
              <p class="test-urls">
                <strong>URLs de teste:</strong><br>
                <small>https://www.youtube.com/watch?v=dQw4w9WgXcQ (Rick Roll)</small><br>
                <small>https://youtu.be/dQw4w9WgXcQ (Forma curta)</small>
              </p>
            </div>

            <div class="instruction-item">
              <h3>2. Upload Local</h3>
              <ul>
                <li>Clique na aba "Upload do PC"</li>
                <li>Arraste um arquivo de vídeo para a zona, ou</li>
                <li>Clique para selecionar arquivo (MP4, WebM, OGG)</li>
                <li>Máximo: 500MB</li>
                <li>Clique "Enviar vídeo"</li>
                <li>Acompanhe o progresso na barra</li>
              </ul>
              <p class="note">
                <strong>Nota:</strong> Upload requer backend com endpoint 
                <code>POST /api/aulas/&#123;aulaId&#125;/videos</code>
              </p>
            </div>

            <div class="instruction-item">
              <h3>3. Gerenciar Vídeos</h3>
              <ul>
                <li>Vídeos aparecem na lista abaixo</li>
                <li>Cada vídeo mostra tipo (YouTube/Upload) e tamanho</li>
                <li>Passe o mouse sobre o vídeo e use o botão de remover</li>
                <li>Lista é atualizada em tempo real</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Seção: Recursos -->
        <section class="demo-section">
          <h2>Recursos Principais</h2>
          <div class="features-list">
            <div class="feature-item">
              <input type="checkbox" checked disabled>
              <label>Validação de URL do YouTube em tempo real</label>
            </div>
            <div class="feature-item">
              <input type="checkbox" checked disabled>
              <label>Preview do YouTube com thumbnail</label>
            </div>
            <div class="feature-item">
              <input type="checkbox" checked disabled>
              <label>Drag-and-drop de arquivos</label>
            </div>
            <div class="feature-item">
              <input type="checkbox" checked disabled>
              <label>Validação de formato de arquivo (MP4, WebM, OGG)</label>
            </div>
            <div class="feature-item">
              <input type="checkbox" checked disabled>
              <label>Validação de tamanho máximo (500MB)</label>
            </div>
            <div class="feature-item">
              <input type="checkbox" checked disabled>
              <label>Barra de progresso em tempo real</label>
            </div>
            <div class="feature-item">
              <input type="checkbox" checked disabled>
              <label>Mensagens de erro amigáveis</label>
            </div>
            <div class="feature-item">
              <input type="checkbox" checked disabled>
              <label>Múltiplos vídeos por aula</label>
            </div>
            <div class="feature-item">
              <input type="checkbox" checked disabled>
              <label>Preview de miniaturas</label>
            </div>
            <div class="feature-item">
              <input type="checkbox" checked disabled>
              <label>Remoção de vídeos</label>
            </div>
            <div class="feature-item">
              <input type="checkbox" checked disabled>
              <label>Interface responsiva (mobile-friendly)</label>
            </div>
            <div class="feature-item">
              <input type="checkbox" checked disabled>
              <label>Abas intuitivas com feedback visual</label>
            </div>
          </div>
        </section>

        <!-- Seção: API -->
        <section class="demo-section">
          <h2>API & Integração</h2>
          <div class="api-reference">
            <h3>Interface Video</h3>
            <pre><code>interface Video &#123;
  id?: string;
  tipo: 'youtube' | 'upload';
  url: string;
  titulo?: string;
  thumbnail?: string;
  tamanho?: number;
  duracao?: number;
&#125;</code></pre>

            <h3>Events</h3>
            <pre><code>// Emite quando vídeos são adicionados
(videosAdicionados)="onVideosAdicionados(videos: Video[])"

// Emite quando um vídeo é removido
(videoRemovido)="onVideoRemovido()"</code></pre>

            <h3>Inputs</h3>
            <pre><code>// ID da aula para upload
[aulaId]="123"</code></pre>
          </div>
        </section>

        <!-- Seção: Exemplo de Implementação -->
        <section class="demo-section">
          <h2>Exemplo de Implementação</h2>
          <pre><code [textContent]="exemploImplementacao"></code></pre>
        </section>

        <!-- Seção: Testes Recomendados -->
        <section class="demo-section">
          <h2>Cenários de Teste</h2>
          <div class="test-scenarios">
            <div class="test-card">
              <h3>URLs Válidas do YouTube</h3>
              <p>youtube.com/watch?v=ID</p>
              <p>youtu.be/ID</p>
              <p>youtube.com/shorts/ID</p>
            </div>
            <div class="test-card">
              <h3>URLs Inválidas</h3>
              <p>youtubeee.com/watch?v=123</p>
              <p>https://google.com</p>
              <p>texto aleatório</p>
            </div>
            <div class="test-card">
              <h3>Upload Válido</h3>
              <p>Arquivo: video.mp4 (50MB)</p>
              <p>Dragged ou clicado</p>
              <p>Progresso visível</p>
            </div>
            <div class="test-card">
              <h3>Upload Inválido</h3>
              <p>Arquivo > 500MB</p>
              <p>Formato: .exe, .zip, .jpg</p>
              <p>Mensagem de erro exibida</p>
            </div>
          </div>
        </section>

        <!-- Seção: Troubleshooting -->
        <section class="demo-section">
          <h2>Troubleshooting</h2>
          <div class="faq">
            <details>
              <summary>Upload não funciona</summary>
              <p>Verifique se o backend endpoint está implementado: <code>POST /api/aulas/{{ '{' }}aulaId{{ '}' }}/videos</code></p>
            </details>
            <details>
              <summary>YouTube preview não aparece</summary>
              <p>Use uma URL válida. O componente valida em tempo real. Veja exemplos acima.</p>
            </details>
            <details>
              <summary>Drag-drop não funciona</summary>
              <p>Certifique-se de estar na aba de Upload e que o arquivo é do tipo correto.</p>
            </details>
            <details>
              <summary>Estilos não aparecem corretamente</summary>
              <p>O componente usa <code>ChangeDetectionStrategy.OnPush</code>. Verifique se o módulo está importado.</p>
            </details>
          </div>
        </section>

        <!-- Footer -->
        <footer class="demo-footer">
          <p>Documentação: Ver <code>VIDEO_UPLOAD_README.md</code></p>
          <p>Integração: Ver <code>EXEMPLO_INTEGRACAO.ts</code></p>
          <p>Suporte: Contate a equipe de desenvolvimento</p>
        </footer>
      </div>
    </div>
  `
})
export class VideoUploadDemoComponent {
  videosAdicionados: Video[] = [];

  get videosYoutube(): number {
    return this.videosAdicionados.filter(v => v.tipo === 'youtube').length;
  }

  get videosUploads(): number {
    return this.videosAdicionados.filter(v => v.tipo === 'upload').length;
  }

  get tamanhoTotal(): string {
    const bytes = this.videosAdicionados.reduce((sum, v) => sum + (v.tamanho || 0), 0);
    return this.formatarTamanho(bytes);
  }

  exemploImplementacao = `
import { VideoUploadComponent, Video } from '@shared/components';

import { IconComponent } from './icon.component';
@Component({
  selector: 'app-aula-editor',
  imports: [VideoUploadComponent],
  template: \`
    <app-video-upload
      [aulaId]="aulaId"
      (videosAdicionados)="onVideosAdicionados(\$event)"
      (videoRemovido)="onVideoRemovido()"
    ></app-video-upload>
  \`
})
export class AulaEditorComponent {
  aulaId = 123;

  onVideosAdicionados(videos: Video[]): void {
    console.log('Vídeos:', videos);
    // Salvar no backend
  }

  onVideoRemovido(): void {
    console.log('Vídeo removido');
  }
}`;

  onVideosAdicionados(videos: Video[]): void {
    this.videosAdicionados = videos;
    console.log('Vídeos adicionados:', videos);
  }

  onVideoRemovido(): void {
    console.log('Vídeo removido');
    // videosAdicionados já será atualizado pelo evento anterior
  }

  private formatarTamanho(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const tamanhos = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + tamanhos[i];
  }
}
