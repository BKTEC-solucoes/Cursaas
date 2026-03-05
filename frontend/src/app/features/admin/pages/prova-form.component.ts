import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

interface Curso {
  id: number;
  nome: string;
}

interface Opcao {
  texto: string;
  correta: boolean;
}

interface Questao {
  enunciado: string;
  tipo: string;
  pontos: number;
  opcoes: Opcao[];
}

@Component({
  selector: 'app-admin-prova-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h2>{{ provaId ? 'Editar Prova' : 'Nova Prova' }}</h2>
        <div class="header-actions">
          <button class="btn-secondary" [routerLink]="['/admin/provas']">← Voltar</button>
          <button class="btn-primary" (click)="salvar()" [disabled]="salvando || !provaForm.valid">
            {{ salvando ? 'Salvando...' : 'Salvar Prova' }}
          </button>
        </div>
      </div>

      <div class="form-container">
        <!-- Dados Básicos da Prova -->
        <div class="form-section">
          <h3>📝 Dados da Prova</h3>
          
          <form [formGroup]="provaForm">
            <div class="form-row">
              <div class="form-group">
                <label for="titulo">Título *</label>
                <input 
                  type="text" 
                  id="titulo" 
                  formControlName="titulo"
                  placeholder="Ex: Avaliação Módulo 1">
                <div class="error" *ngIf="provaForm.get('titulo')?.invalid && provaForm.get('titulo')?.touched">
                  Título é obrigatório
                </div>
              </div>

              <div class="form-group">
                <label for="curso">Curso *</label>
                <select id="curso" formControlName="curso_id">
                  <option [value]="null">Selecione um curso</option>
                  <option *ngFor="let curso of cursos" [value]="curso.id">{{ curso.nome }}</option>
                </select>
                <div class="error" *ngIf="provaForm.get('curso_id')?.invalid && provaForm.get('curso_id')?.touched">
                  Curso é obrigatório
                </div>
              </div>
            </div>

            <div class="form-group">
              <label for="descricao">Descrição</label>
              <textarea 
                id="descricao" 
                formControlName="descricao"
                rows="3"
                placeholder="Descrição da prova (opcional)"></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="data_inicio">Data/Hora Início *</label>
                <input 
                  type="datetime-local" 
                  id="data_inicio" 
                  formControlName="data_inicio">
              </div>

              <div class="form-group">
                <label for="data_fim">Data/Hora Fim *</label>
                <input 
                  type="datetime-local" 
                  id="data_fim" 
                  formControlName="data_fim">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="tentativas">Tentativas Permitidas *</label>
                <input 
                  type="number" 
                  id="tentativas" 
                  formControlName="tentativas_permitidas"
                  min="1">
              </div>

              <div class="form-group">
                <label for="status">Status *</label>
                <select id="status" formControlName="ativo">
                  <option [ngValue]="true">Ativa</option>
                  <option [ngValue]="false">Inativa</option>
                </select>
              </div>
            </div>
          </form>
        </div>

        <!-- Questões -->
        <div class="form-section">
          <div class="section-header">
            <h3>❓ Questões ({{ questoes.length }}) — Total: {{ getTotalPontos() }} pts</h3>
            <button class="btn-primary" (click)="adicionarQuestao()">+ Nova Questão</button>
          </div>

          <div class="questoes-lista" *ngIf="questoes.length > 0">
            <div class="questao-card" *ngFor="let questao of questoes; let i = index">
              <div class="questao-header">
                <span class="questao-numero">Questão {{ i + 1 }}</span>
                <span class="questao-tipo" [class.multipla]="questao.tipo === 'multipla_escolha'" [class.dissertativa]="questao.tipo === 'dissertativa'">
                  {{ questao.tipo === 'multipla_escolha' ? 'Múltipla Escolha' : 'Dissertativa' }}
                </span>
                <label class="questao-pontos-badge" title="Valor da questão">
                  <input
                    class="pontos-inline-input"
                    type="number"
                    [(ngModel)]="questao.pontos"
                    min="0.1"
                    step="0.5"
                    (click)="$event.stopPropagation()"
                  />
                  pts
                </label>
                <button class="btn-delete" (click)="removerQuestao(i)">🗑️</button>
              </div>

              <div class="questao-body">
                <div class="form-group">
                  <label>Enunciado *</label>
                  <textarea 
                    [(ngModel)]="questao.enunciado"
                    rows="2"
                    placeholder="Digite o enunciado da questão"></textarea>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Tipo de Questão</label>
                    <select [(ngModel)]="questao.tipo" (ngModelChange)="ajustarOpcoes(questao)">
                      <option value="multipla_escolha">Múltipla Escolha</option>
                      <option value="dissertativa">Dissertativa</option>
                    </select>
                  </div>
                </div>

                <!-- Opções para Múltipla Escolha -->
                <div class="opcoes-container" *ngIf="questao.tipo === 'multipla_escolha'">
                  <label>Opções de Resposta</label>
                  <div class="opcao-item" *ngFor="let opcao of questao.opcoes; let j = index">
                    <div class="opcao-input">
                      <span class="opcao-letra">{{ getLetter(j) }}</span>
                      <input 
                        type="text" 
                        [(ngModel)]="opcao.texto"
                        [placeholder]="'Opção ' + getLetter(j)">
                      <label class="opcao-correta">
                        <input 
                          type="checkbox" 
                          [checked]="opcao.correta"
                          (change)="toggleCorreta(questao, j, $event)">
                        Correta
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="no-questoes" *ngIf="questoes.length === 0">
            <p>Nenhuma questão adicionada ainda.</p>
            <button class="btn-primary" (click)="adicionarQuestao()">Adicionar Primeira Questão</button>
          </div>
        </div>
      </div>

      <!-- Loading/Error States -->
      <div class="loading" *ngIf="carregando">
        <p>Carregando...</p>
      </div>

      <div class="error-message" *ngIf="erro">
        <p>{{ erro }}</p>
      </div>

      <div class="success-message" *ngIf="sucesso">
        <p>{{ sucesso }}</p>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 20px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 2px solid #eee;
    }

    .page-header h2 {
      margin: 0;
      color: #333;
    }

    .header-actions {
      display: flex;
      gap: 10px;
    }

    .btn-primary, .btn-secondary {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      text-decoration: none;
      display: inline-block;
    }

    .btn-primary {
      background: #f39c12;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #e67e22;
    }

    .btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #95a5a6;
      color: white;
    }

    .btn-secondary:hover {
      background: #7f8c8d;
    }

    .form-container {
      display: flex;
      flex-direction: column;
      gap: 30px;
    }

    .form-section {
      background: white;
      border-radius: 8px;
      padding: 25px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .form-section h3 {
      margin: 0 0 20px 0;
      color: #333;
      font-size: 18px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .section-header h3 {
      margin: 0;
    }

    .form-row {
      display: flex;
      gap: 15px;
    }

    .form-group {
      flex: 1;
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: 600;
      color: #555;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #f39c12;
      box-shadow: 0 0 0 2px rgba(243, 156, 18, 0.2);
    }

    .error {
      color: #e74c3c;
      font-size: 12px;
      margin-top: 5px;
    }

    /* Questões */
    .questoes-lista {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .questao-card {
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
    }

    .questao-header {
      background: #f8f9fa;
      padding: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #ddd;
    }

    .questao-numero {
      font-weight: 600;
      color: #333;
    }

    .questao-tipo {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }

    .questao-tipo.multipla {
      background: #e3f2fd;
      color: #1976d2;
    }

    .questao-tipo.dissertativa {
      background: #f3e5f5;
      color: #7b1fa2;
    }

    .questao-pontos-badge {
      background: #fff3cd;
      color: #856404;
      border: 1px solid #ffc107;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      cursor: text;
    }

    .pontos-inline-input {
      width: 44px;
      border: none;
      background: transparent;
      color: #856404;
      font-size: 12px;
      font-weight: 700;
      text-align: right;
      padding: 0;
      -moz-appearance: textfield;
    }
    .pontos-inline-input::-webkit-outer-spin-button,
    .pontos-inline-input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    .pontos-inline-input:focus {
      outline: 1px solid #b8860b;
      border-radius: 2px;
    }

    .btn-delete {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      padding: 4px;
    }

    .btn-delete:hover {
      transform: scale(1.2);
    }

    .questao-body {
      padding: 20px;
    }

    /* Opções */
    .opcoes-container {
      margin-top: 15px;
    }

    .opcao-item {
      margin-bottom: 10px;
    }

    .opcao-input {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .opcao-letra {
      background: #495057;
      color: white;
      width: 25px;
      height: 25px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      flex-shrink: 0;
    }

    .opcao-input input[type="text"] {
      flex: 1;
    }

    .opcao-correta {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      color: #28a745;
      font-weight: 600;
      cursor: pointer;
    }

    .no-questoes {
      text-align: center;
      padding: 40px;
      color: #999;
    }

    .no-questoes p {
      margin-bottom: 15px;
    }

    /* Messages */
    .loading {
      text-align: center;
      padding: 20px;
      color: #999;
    }

    .error-message {
      background: #f8d7da;
      color: #721c24;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
      border: 1px solid #f5c6cb;
    }

    .success-message {
      background: #d4edda;
      color: #155724;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
      border: 1px solid #c3e6cb;
    }

    @media (max-width: 768px) {
      .form-row {
        flex-direction: column;
      }

      .page-header {
        flex-direction: column;
        gap: 15px;
      }

      .header-actions {
        width: 100%;
        justify-content: space-between;
      }
    }
  `]
})
export class AdminProvaFormComponent implements OnInit {
  provaForm: FormGroup;
  provaId: number | null = null;
  cursos: Curso[] = [];
  questoes: Questao[] = [];
  
  carregando = false;
  salvando = false;
  erro = '';
  sucesso = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.provaForm = this.fb.group({
      titulo: ['', Validators.required],
      descricao: [''],
      curso_id: [null, Validators.required],
      data_inicio: ['', Validators.required],
      data_fim: ['', Validators.required],
      tentativas_permitidas: [1, [Validators.required, Validators.min(1)]],
      ativo: [true]
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.provaId = +params['id'];
        this.carregarProva();
      }
    });
    
    this.carregarCursos();
  }

  carregarCursos(): void {
    this.http.get<Curso[]>('http://localhost:8000/api/cursos').subscribe({
      next: (cursos) => {
        this.cursos = cursos || [];
      },
      error: (error) => {
        console.error('Erro ao carregar cursos:', error);
      }
    });
  }

  carregarProva(): void {
    if (!this.provaId) return;

    this.carregando = true;
    this.http.get(`http://localhost:8000/api/provas/${this.provaId}`).subscribe({
      next: (prova: any) => {
        this.provaForm.patchValue({
          titulo: prova.titulo,
          descricao: prova.descricao,
          curso_id: prova.curso_id,
          data_inicio: this.formatDateForInput(prova.data_inicio),
          data_fim: this.formatDateForInput(prova.data_fim),
          tentativas_permitidas: prova.tentativas_permitidas,
          ativo: prova.ativo
        });

        this.questoes = (prova.questoes || []).map((q: any) => ({
          ...q,
          pontos: Number(q.pontos) || 1
        }));
        this.carregando = false;
      },
      error: (error) => {
        console.error('Erro ao carregar prova:', error);
        this.erro = 'Erro ao carregar prova';
        this.carregando = false;
      }
    });
  }

  formatDateForInput(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
  }

  adicionarQuestao(): void {
    this.questoes.push({
      enunciado: '',
      tipo: 'multipla_escolha',
      pontos: 1,
      opcoes: [
        { texto: '', correta: false },
        { texto: '', correta: false },
        { texto: '', correta: false },
        { texto: '', correta: false }
      ]
    });
  }

  removerQuestao(index: number): void {
    if (confirm('Tem certeza que deseja remover esta questão?')) {
      this.questoes.splice(index, 1);
    }
  }

  ajustarOpcoes(questao: Questao): void {
    if (questao.tipo === 'multipla_escolha') {
      questao.opcoes = [
        { texto: '', correta: false },
        { texto: '', correta: false },
        { texto: '', correta: false },
        { texto: '', correta: false }
      ];
    } else {
      questao.opcoes = [];
    }
  }

  marcarCorreta(questao: Questao, index: number): void {
    questao.opcoes.forEach((opcao, i) => {
      opcao.correta = i === index;
    });
  }

  toggleCorreta(questao: Questao, index: number, event: any): void {
    const isChecked = event.target.checked;
    
    if (isChecked) {
      // Marcar esta opção como correta e desmarcar as outras
      questao.opcoes.forEach((opcao, i) => {
        opcao.correta = i === index;
      });
    } else {
      // Desmarcar esta opção
      questao.opcoes[index].correta = false;
    }
  }

  getLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  getTotalPontos(): number {
    return this.questoes.reduce((sum, q) => sum + (Number(q.pontos) || 1), 0);
  }

  salvar(): void {
    if (!this.provaForm.valid) {
      this.erro = 'Preencha todos os campos obrigatórios';
      return;
    }

    if (this.questoes.length === 0) {
      this.erro = 'Adicione pelo menos uma questão';
      return;
    }

    // Validar questões
    for (let i = 0; i < this.questoes.length; i++) {
      const questao = this.questoes[i];
      
      if (!questao.enunciado.trim()) {
        this.erro = `O enunciado da questão ${i + 1} é obrigatório`;
        return;
      }

      if (questao.tipo === 'multipla_escolha') {
        const opcoesPreenchidasCorretamente = questao.opcoes.every(op => op.texto.trim() !== '');
        if (!opcoesPreenchidasCorretamente) {
          this.erro = `Todas as opções da questão ${i + 1} devem ser preenchidas`;
          return;
        }

        const temOpcaoCorreta = questao.opcoes.some(op => op.correta);
        if (!temOpcaoCorreta) {
          this.erro = `Marque a opção correta na questão ${i + 1}`;
          return;
        }
      }
    }

    this.salvando = true;
    this.erro = '';
    this.sucesso = '';

    const dadosProva = {
      ...this.provaForm.value,
      ativo: this.provaForm.value.ativo === true || this.provaForm.value.ativo === 'true',
      questoes: this.questoes
    };

    const request = this.provaId 
      ? this.http.put(`http://localhost:8000/api/provas/${this.provaId}`, dadosProva)
      : this.http.post('http://localhost:8000/api/provas', dadosProva);

    request.subscribe({
      next: (response: any) => {
        this.salvando = false;
        this.sucesso = this.provaId ? 'Prova atualizada com sucesso!' : 'Prova criada com sucesso!';
        
        setTimeout(() => {
          this.router.navigate(['/admin/provas']);
        }, 1500);
      },
      error: (error) => {
        console.error('Erro ao salvar prova:', error);
        this.salvando = false;
        this.erro = error.error?.detail || 'Erro ao salvar prova';
      }
    });
  }
}