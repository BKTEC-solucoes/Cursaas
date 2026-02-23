import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-aluno-cursos',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <h2>Meus Cursos</h2>
      <div class="courses-grid">
        <p style="color: #999; text-align: center; padding: 40px;">
          Você não está inscrito em nenhum curso ainda.
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
    .courses-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      min-height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `]
})
export class AlunoCursosComponent {}
