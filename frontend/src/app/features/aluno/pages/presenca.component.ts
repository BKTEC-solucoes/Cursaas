import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-aluno-presenca',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h2>Minha Presença</h2>
      <div class="table-container">
        <p style="color: #999; text-align: center; padding: 40px;">
          Registros de presença aparecerão aqui.
        </p>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h2 {
      margin-bottom: 20px;
      color: #333;
    }
    .table-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
  `]
})
export class AlunoPresencaComponent {}
