import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Aula {
  id: number;
  titulo: string;
  descricao: string;
  data_aula: string;
  duracao_minutos: number;
  curso_id: number;
  videos?: any[];
}

@Component({
  selector: 'app-admin-aulas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h2>Gerenciar Aulas & Vídeos</h2>
        <button class="btn-primary" (click)="abrirFormulario()">+ Nova Aula</button>
      </div>

      <div class="aulas-table" *ngIf="aulas.length > 0">
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Duração</th>
              <th>Data</th>
              <th>Vídeo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let aula of aulas">
              <td class="aula-titulo">{{ aula.titulo }}</td>
              <td>{{ aula.duracao_minutos }}min</td>
              <td>{{ aula.data_aula | date:'dd/MM/yyyy HH:mm' }}</td>
              <td>
                <span class="video-status" *ngIf="aula.videos && aula.videos.length > 0" style="color: #28A745;">
                  ✓ Sim
                </span>
                <span class="video-status" *ngIf="!aula.videos || aula.videos.length === 0" style="color: #999;">
                  ✗ Não
                </span>
              </td>
              <td class="actions">
                <button class="btn-sm btn-edit" title="Editar" (click)="editarAula(aula)">✏️</button>
                <button class="btn-sm btn-video" title="Upload de Vídeo" (click)="abrirUploadVideo(aula)">🎥</button>
                <button class="btn-sm btn-delete" title="Deletar" (click)="deletarAula(aula)">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="no-data" *ngIf="aulas.length === 0 && !carregando">
        <p>Nenhuma aula criada ainda. Clique em "Nova Aula" para começar.</p>
      </div>

      <div class="loading" *ngIf="carregando">
        <div class="spinner"></div>
        <p>Carregando aulas...</p>
      </div>

      <div class="error" *ngIf="erro">
        <p>{{ erro }}</p>
        <button (click)="carregarAulas()">Tentar novamente</button>
      </div>

      <!-- Modal Upload Vídeo -->
      <div class="modal-overlay" *ngIf="modalUploadAberto" (click)="fecharModalUpload()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Upload de Vídeo</h3>
            <button class="btn-close" (click)="fecharModalUpload()">✕</button>
          </div>

          <div class="modal-body">
            <p class="aula-nome" *ngIf="aulaParaUpload"><strong>Aula:</strong> {{ aulaParaUpload.titulo }}</p>

            <div class="upload-area" 
              [class.dragover]="dragover"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onFileDrop($event)">
              
              <div class="upload-content">
                <span class="upload-icon">📹</span>
                <p><strong>Arraste um vídeo aqui</strong></p>
                <p class="small">ou</p>
                <label class="btn-selecionar">
                  <span>Selecione um arquivo</span>
                  <input type="file" 
                    #fileInput
                    (change)="onFileSelected($event)" 
                    accept="video/*" 
                    style="display: none;">
                </label>
              </div>

              <p class="formatos-suportados">
                <small>Formatos suportados: MP4, WebM, AVI, MOV (máx 500 MB)</small>
              </p>
            </div>

            <div class="arquivo-selecionado" *ngIf="arquivoSelecionado">
              <p><strong>Arquivo:</strong> {{ arquivoSelecionado.name }}</p>
              <p><strong>Tamanho:</strong> {{ (arquivoSelecionado.size / 1024 / 1024).toFixed(2) }} MB</p>
            </div>

            <div class="progresso-upload" *ngIf="uploadEmProgresso">
              <div class="progress-bar">
                <div class="progress" [style.width.%]="percentualUpload"></div>
              </div>
              <p>{{ percentualUpload }}% - Enviando...</p>
            </div>

            <div class="success-message" *ngIf="uploadSucesso">
              <p>✓ Vídeo enviado com sucesso!</p>
            </div>

            <div class="error-message" *ngIf="erroUpload">
              <p>✗ {{ erroUpload }}</p>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-cancelar" (click)="fecharModalUpload()" [disabled]="uploadEmProgresso">
              Cancelar
            </button>
            <button class="btn-enviar" 
              (click)="enviarVideo()" 
              [disabled]="!arquivoSelecionado || uploadEmProgresso">
              {{ uploadEmProgresso ? 'Enviando...' : 'Enviar Vídeo' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      gap: 15px;
    }

    .page-header h2 {
      margin: 0;
      color: #333;
    }

    .btn-primary {
      background-color: #e74c3c;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: background-color 0.2s;
      white-space: nowrap;
    }

    .btn-primary:hover {
      background-color: #c0392b;
    }

    .aulas-table {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead {
      background: #f5f5f5;
      border-bottom: 2px solid #ddd;
    }

    th {
      padding: 15px;
      text-align: left;
      font-weight: 600;
      color: #333;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    td {
      padding: 15px;
      border-bottom: 1px solid #eee;
      font-size: 14px;
    }

    tbody tr:hover {
      background-color: #f9f9f9;
    }

    .aula-titulo {
      font-weight: 600;
      color: #333;
    }

    .video-status {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }

    .actions {
      display: flex;
      gap: 8px;
    }

    .btn-sm {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      padding: 4px 8px;
      transition: transform 0.2s;
    }

    .btn-sm:hover {
      transform: scale(1.2);
    }

    .btn-edit { color: #3498db; }
    .btn-video { color: #e74c3c; }
    .btn-delete { color: #95a5a6; }

    .no-data {
      background: white;
      padding: 60px 20px;
      text-align: center;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      color: #999;
    }

    .loading {
      text-align: center;
      padding: 60px 20px;
      color: #999;
    }

    .spinner {
      display: inline-block;
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #e74c3c;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 15px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error {
      background: #f8d7da;
      color: #721c24;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 20px;
      border: 1px solid #f5c6cb;
      text-align: center;
    }

    .error button {
      margin-top: 10px;
      padding: 8px 16px;
      background: #721c24;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
    }

    /* MODAL STYLES */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #eee;
    }

    .modal-header h3 {
      margin: 0;
      color: #333;
      font-size: 18px;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #999;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-close:hover {
      color: #333;
    }

    .modal-body {
      padding: 20px;
    }

    .aula-nome {
      margin: 0 0 20px 0;
      color: #666;
      font-size: 14px;
    }

    .upload-area {
      border: 2px dashed #ddd;
      border-radius: 8px;
      padding: 30px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 15px;
    }

    .upload-area:hover {
      border-color: #e74c3c;
      background-color: #ffe8e8;
    }

    .upload-area.dragover {
      border-color: #e74c3c;
      background-color: #ffe8e8;
      transform: scale(1.02);
    }

    .upload-content {
      margin-bottom: 15px;
    }

    .upload-icon {
      font-size: 48px;
      display: block;
      margin-bottom: 10px;
    }

    .upload-content p {
      margin: 8px 0;
      color: #333;
    }

    .upload-content p.small {
      font-size: 12px;
      color: #999;
      margin: 5px 0;
    }

    .btn-selecionar {
      display: inline-block;
      background: #e74c3c;
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      transition: background-color 0.2s;
    }

    .btn-selecionar:hover {
      background-color: #c0392b;
    }

    .formatos-suportados {
      margin: 10px 0 0 0;
      color: #999;
      font-size: 12px;
    }

    .arquivo-selecionado {
      background: #f0f0f0;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 15px;
    }

    .arquivo-selecionado p {
      margin: 5px 0;
      color: #333;
      font-size: 13px;
    }

    .progresso-upload {
      margin-bottom: 15px;
    }

    .progress-bar {
      height: 4px;
      background: #f0f0f0;
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .progress {
      height: 100%;
      background: linear-gradient(90deg, #e74c3c, #c0392b);
      transition: width 0.3s;
    }

    .progresso-upload p {
      margin: 0;
      color: #666;
      font-size: 13px;
    }

    .success-message {
      background: #d4edda;
      color: #155724;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 15px;
      border: 1px solid #c3e6cb;
    }

    .success-message p {
      margin: 0;
      font-size: 14px;
    }

    .error-message {
      background: #f8d7da;
      color: #721c24;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 15px;
      border: 1px solid #f5c6cb;
    }

    .error-message p {
      margin: 0;
      font-size: 14px;
    }

    .modal-footer {
      display: flex;
      gap: 10px;
      padding: 15px 20px;
      border-top: 1px solid #eee;
      justify-content: flex-end;
    }

    .btn-cancelar {
      padding: 10px 20px;
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      transition: background-color 0.2s;
    }

    .btn-cancelar:hover:not(:disabled) {
      background-color: #efefef;
    }

    .btn-cancelar:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-enviar {
      padding: 10px 20px;
      background: #e74c3c;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      transition: background-color 0.2s;
    }

    .btn-enviar:hover:not(:disabled) {
      background-color: #c0392b;
    }

    .btn-enviar:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      table { font-size: 12px; }
      th, td { padding: 10px; }
      .actions { flex-direction: column; }
      .modal-content { width: 95%; }
    }
  `]
})
export class AdminAulasComponent implements OnInit {
  aulas: Aula[] = [];
  carregando = false;
  erro = '';

  // Modal Upload
  modalUploadAberto = false;
  aulaParaUpload: Aula | null = null;
  arquivoSelecionado: File | null = null;
  uploadEmProgresso = false;
  percentualUpload = 0;
  uploadSucesso = false;
  erroUpload = '';
  dragover = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.carregarAulas();
  }

  carregarAulas(): void {
    this.carregando = true;
    this.erro = '';

    this.http.get<Aula[]>('http://localhost:8000/api/aulas').subscribe({
      next: (aulas) => {
        this.aulas = aulas || [];
        this.carregando = false;
      },
      error: (error: any) => {
        console.error('Erro ao carregar aulas:', error);
        this.erro = 'Erro ao carregar aulas. Tente novamente.';
        this.carregando = false;
      }
    });
  }

  abrirFormulario(): void {
    alert('Formulário de nova aula - a implementar');
  }

  editarAula(aula: Aula): void {
    alert('Editar aula: ' + aula.titulo + ' - a implementar');
  }

  deletarAula(aula: Aula): void {
    if (confirm(`Tem certeza que deseja deletar a aula "${aula.titulo}"?`)) {
      alert('Deletar aula - a implementar');
    }
  }

  abrirUploadVideo(aula: Aula): void {
    this.aulaParaUpload = aula;
    this.modalUploadAberto = true;
    this.arquivoSelecionado = null;
    this.uploadSucesso = false;
    this.erroUpload = '';
  }

  fecharModalUpload(): void {
    if (!this.uploadEmProgresso) {
      this.modalUploadAberto = false;
      this.aulaParaUpload = null;
      this.arquivoSelecionado = null;
      this.uploadSucesso = false;
      this.erroUpload = '';
      this.percentualUpload = 0;
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragover = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragover = false;
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragover = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.arquivoSelecionado = files[0];
    }
  }

  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    if (files && files.length > 0) {
      this.arquivoSelecionado = files[0];
    }
  }

  enviarVideo(): void {
    if (!this.aulaParaUpload || !this.arquivoSelecionado) {
      this.erroUpload = 'Selecione um arquivo de vídeo';
      return;
    }

    const maxSize = 500 * 1024 * 1024; // 500 MB
    if (this.arquivoSelecionado.size > maxSize) {
      this.erroUpload = `Arquivo muito grande (${(this.arquivoSelecionado.size / 1024 / 1024).toFixed(2)} MB). Máximo: 500 MB`;
      return;
    }

    // Validar formato
    const nomeArquivo = this.arquivoSelecionado.name.toLowerCase();
    const formatosPermitidos = ['mp4', 'webm', 'avi', 'mov'];
    const extensao = nomeArquivo.split('.').pop();
    
    if (!extensao || !formatosPermitidos.includes(extensao)) {
      this.erroUpload = `Formato não suportado: .${extensao}. Permitidos: ${formatosPermitidos.join(', ')}`;
      return;
    }

    this.uploadEmProgresso = true;
    this.erroUpload = '';
    this.uploadSucesso = false;
    this.percentualUpload = 0;

    const formData = new FormData();
    formData.append('file', this.arquivoSelecionado);

    const url = `http://localhost:8000/api/aulas/${this.aulaParaUpload.id}/upload-video`;

    this.http.post(url, formData, {
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event: any) => {
        if (event.type === 4) {
          // Upload completo (HttpResponse)
          this.uploadEmProgresso = false;
          this.uploadSucesso = true;
          this.percentualUpload = 100;
          
          // Atualizar lista de aulas
          setTimeout(() => {
            this.carregarAulas();
            this.fecharModalUpload();
          }, 2000);
        } else if (event.type === 1) {
          // Progress event
          const total = event.total;
          const atual = event.loaded;
          this.percentualUpload = Math.round((atual / total) * 100);
        }
      },
      error: (error: any) => {
        console.error('Erro no upload:', error);
        this.uploadEmProgresso = false;
        
        // Tentar extrair mensagem de erro detalhada
        let mensagemErro = 'Erro ao fazer upload do vídeo. Tente novamente.';
        
        if (error.error) {
          if (typeof error.error === 'string') {
            mensagemErro = error.error;
          } else if (error.error.detail) {
            mensagemErro = error.error.detail;
          } else if (error.error.message) {
            mensagemErro = error.error.message;
          }
        }
        
        if (error.status === 0) {
          mensagemErro = 'Erro de conexão. Verifique se o servidor está rodando.';
        } else if (error.status === 401) {
          mensagemErro = 'Não autorizado. Faça login novamente.';
        } else if (error.status === 403) {
          mensagemErro = 'Acesso negado. Você precisa ser admin.';
        } else if (error.status === 404) {
          mensagemErro = 'Aula não encontrada.';
        } else if (error.status === 413) {
          mensagemErro = 'Arquivo muito grande.';
        }
        
        this.erroUpload = mensagemErro;
      }
    });
  }
}
