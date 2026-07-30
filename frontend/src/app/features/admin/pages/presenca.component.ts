import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface Presenca {
  id: number;
  usuario_id: number;
  aula_id: number;
  usuario_nome: string;
  aula_titulo: string;
  percentual_assistido: number;
  registrada_automaticamente: boolean;
  tempo_total_segundos: number;
  data_acesso: string;
  data_conclusao: string;
}

@Component({
  selector: 'app-admin-presenca',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h2>Presença dos Alunos</h2>
        <button class="btn-filter" (click)="abrirFiltros()">🔍 Filtrar por Curso</button>
      </div>

      <div class="presenca-table" *ngIf="presencas.length > 0">
        <table>
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Aula</th>
              <th>Percentual</th>
              <th>Tipo Registro</th>
              <th>Data Acesso</th>
              <th>Conclusão</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of presencas" [class.nao-presente]="p.percentual_assistido < 75">
              <td class="aluno-nome">{{ p.usuario_nome }}</td>
              <td>{{ p.aula_titulo }}</td>
              <td>
                <div class="progress-bar">
                  <div class="progress" [style.width.%]="p.percentual_assistido"></div>
                  <span class="progress-label">{{ p.percentual_assistido }}%</span>
                </div>
              </td>
              <td>
                <span class="tipo-registro" [ngClass]="p.registrada_automaticamente ? 'auto' : 'manual'">
                  {{ p.registrada_automaticamente ? '⚙️ Automático' : '✏️ Manual' }}
                </span>
              </td>
              <td>{{ p.data_acesso | date:'dd/MM/yyyy HH:mm' }}</td>
              <td *ngIf="p.data_conclusao">{{ p.data_conclusao | date:'dd/MM/yyyy HH:mm' }}</td>
              <td *ngIf="!p.data_conclusao" style="color: #999;">-</td>
              <td>
                <button class="btn-editar" (click)="abrirEdicao(p)" title="Editar presença manualmente">
                  ✏️ Editar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="no-data" *ngIf="presencas.length === 0 && !carregando">
        <p>Nenhum registro de presença ainda.</p>
      </div>

      <div class="loading" *ngIf="carregando">
        <div class="spinner"></div>
        <p>Carregando registros de presença...</p>
      </div>

      <div class="error" *ngIf="erro">
        <p>{{ erro }}</p>
        <button (click)="carregarPresencas()">Tentar novamente</button>
      </div>
    </div>

    <!-- Modal de Edição Manual de Presença -->
    <div class="modal-overlay" *ngIf="presencaEmEdicao" (click)="fecharEdicao()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>✏️ Editar Presença Manualmente</h3>
          <button class="btn-fechar" (click)="fecharEdicao()">✕</button>
        </div>
        <div class="modal-body">
          <div class="info-edicao">
            <p><strong>Aluno:</strong> {{ presencaEmEdicao.usuario_nome }}</p>
            <p><strong>Aula:</strong> {{ presencaEmEdicao.aula_titulo }}</p>
          </div>
          <div class="form-group">
            <label for="percentual">Percentual Assistido (%)</label>
            <input
              id="percentual"
              type="range"
              min="0"
              max="100"
              step="1"
              [(ngModel)]="percentualEdicao"
              class="slider"
            />
            <div class="slider-value" [ngClass]="percentualEdicao >= 75 ? 'presente' : 'ausente'">
              {{ percentualEdicao }}%
              <span *ngIf="percentualEdicao >= 75"> — ✅ Presença registrada</span>
              <span *ngIf="percentualEdicao < 75"> — ❌ Ausente (mín. 75%)</span>
            </div>
          </div>
          <div class="aviso-manual">
            ⚠️ Esta edição será registrada como <strong>manual</strong>.
          </div>
          <div class="error" *ngIf="erroEdicao">{{ erroEdicao }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancelar" (click)="fecharEdicao()" [disabled]="salvandoEdicao">Cancelar</button>
          <button class="btn-salvar" (click)="salvarEdicao()" [disabled]="salvandoEdicao">
            {{ salvandoEdicao ? 'Salvando...' : '💾 Salvar' }}
          </button>
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

    .btn-filter {
      background-color: #3498db;
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

    .btn-filter:hover {
      background-color: #2980b9;
    }

    .presenca-table {
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

    tbody tr.nao-presente {
      background-color: #fef5f5;
    }

    .aluno-nome {
      font-weight: 600;
      color: #333;
    }

    .progress-bar {
      position: relative;
      height: 24px;
      background: #f0f0f0;
      border-radius: 4px;
      overflow: hidden;
    }

    .progress {
      height: 100%;
      background: linear-gradient(90deg, #27ae60, #2ecc71);
      transition: width 0.3s;
    }

    .progress-bar.low .progress {
      background: linear-gradient(90deg, #e74c3c, #c0392b);
    }

    .progress-label {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      color: #333;
      font-weight: 600;
      font-size: 12px;
      z-index: 1;
    }

    .tipo-registro {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }

    .tipo-registro.auto {
      background: #d4edda;
      color: #155724;
    }

    .tipo-registro.manual {
      background: #cfe2ff;
      color: #084298;
    }

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
      border-top: 4px solid #3498db;
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

    @media (max-width: 768px) {
      table { font-size: 12px; }
      th, td { padding: 10px; }
    }

    .btn-editar {
      background-color: #f39c12;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: background-color 0.2s;
      white-space: nowrap;
    }

    .btn-editar:hover {
      background-color: #d68910;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal {
      background: white;
      border-radius: 10px;
      width: 460px;
      max-width: 95vw;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px 16px;
      border-bottom: 1px solid #eee;
    }

    .modal-header h3 {
      margin: 0;
      color: #333;
      font-size: 18px;
    }

    .btn-fechar {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #999;
      padding: 4px 8px;
      border-radius: 4px;
      line-height: 1;
    }

    .btn-fechar:hover {
      background: #f5f5f5;
      color: #333;
    }

    .modal-body {
      padding: 24px;
    }

    .info-edicao {
      background: #f8f9fa;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 20px;
    }

    .info-edicao p {
      margin: 4px 0;
      font-size: 14px;
      color: #555;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      font-weight: 600;
      margin-bottom: 10px;
      color: #333;
      font-size: 14px;
    }

    .slider {
      width: 100%;
      height: 6px;
      appearance: none;
      -webkit-appearance: none;
      background: #ddd;
      border-radius: 3px;
      outline: none;
      cursor: pointer;
    }

    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 20px;
      height: 20px;
      background: #3498db;
      border-radius: 50%;
      cursor: pointer;
    }

    .slider-value {
      text-align: center;
      margin-top: 10px;
      font-size: 20px;
      font-weight: 700;
    }

    .slider-value.presente {
      color: #27ae60;
    }

    .slider-value.ausente {
      color: #e74c3c;
    }

    .slider-value span {
      font-size: 13px;
      font-weight: 500;
    }

    .aviso-manual {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 6px;
      padding: 10px 14px;
      font-size: 13px;
      color: #856404;
      margin-top: 16px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid #eee;
    }

    .btn-cancelar {
      background: white;
      color: #666;
      border: 1px solid #ccc;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
      transition: background 0.2s;
    }

    .btn-cancelar:hover:not(:disabled) {
      background: #f5f5f5;
    }

    .btn-salvar {
      background: #27ae60;
      color: white;
      border: none;
      padding: 10px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
      transition: background 0.2s;
    }

    .btn-salvar:hover:not(:disabled) {
      background: #219a52;
    }

    .btn-salvar:disabled, .btn-cancelar:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `]
})
export class AdminPresencaComponent implements OnInit {
  presencas: Presenca[] = [];
  carregando = false;
  erro = '';

  presencaEmEdicao: Presenca | null = null;
  percentualEdicao = 0;
  salvandoEdicao = false;
  erroEdicao = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.carregarPresencas();
  }

  carregarPresencas(): void {
    this.carregando = true;
    this.erro = '';

    this.http.get<Presenca[]>(`${environment.apiUrl}/presenca/`).subscribe({
      next: (presencas) => {
        this.presencas = presencas || [];
        this.carregando = false;
      },
      error: (error: any) => {
        console.error('Erro ao carregar presença:', error);
        this.erro = 'Erro ao carregar registros de presença. Tente novamente.';
        this.carregando = false;
      }
    });
  }

  abrirFiltros(): void {
    alert('Filtros por curso - a implementar');
  }

  abrirEdicao(presenca: Presenca): void {
    this.presencaEmEdicao = presenca;
    this.percentualEdicao = presenca.percentual_assistido;
    this.erroEdicao = '';
  }

  fecharEdicao(): void {
    if (this.salvandoEdicao) return;
    this.presencaEmEdicao = null;
  }

  salvarEdicao(): void {
    if (!this.presencaEmEdicao) return;
    this.salvandoEdicao = true;
    this.erroEdicao = '';

    this.http.put<Presenca>(
      `${environment.apiUrl}/presenca/${this.presencaEmEdicao.id}`,
      { percentual_assistido: this.percentualEdicao }
    ).subscribe({
      next: (atualizado) => {
        const idx = this.presencas.findIndex(p => p.id === atualizado.id);
        if (idx !== -1) {
          this.presencas[idx] = { ...this.presencas[idx], ...atualizado };
        }
        this.salvandoEdicao = false;
        this.presencaEmEdicao = null;
      },
      error: (error: any) => {
        console.error('Erro ao editar presença:', error);
        this.erroEdicao = error?.error?.detail || 'Erro ao salvar. Tente novamente.';
        this.salvandoEdicao = false;
      }
    });
  }
}
