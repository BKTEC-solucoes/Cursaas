import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  constructor(private router: Router) {}

  selectAluno(): void {
    this.router.navigate(['/auth/register/aluno']);
  }

  selectInstituicao(): void {
    this.router.navigate(['/auth/register/instituicao']);
  }

  goBack(): void {
    this.router.navigate(['/auth/login']);
  }
}
