import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register-aluno',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register-aluno.component.html',
  styleUrls: ['./register-aluno.component.css']
})
export class RegisterAlunoComponent {
  nome = '';
  email = '';
  senha = '';
  confirmarSenha = '';
  showSenha = false;
  showConfirmarSenha = false;
  loading = false;
  error = '';
  success = false;

  constructor(private router: Router) {}

  register(): void {
    if (!this.nome || !this.email || !this.senha || !this.confirmarSenha) {
      this.error = 'Todos os campos são obrigatórios';
      return;
    }

    if (this.senha !== this.confirmarSenha) {
      this.error = 'As senhas não coincidem';
      return;
    }

    if (this.senha.length < 6) {
      this.error = 'A senha deve ter no mínimo 6 caracteres';
      return;
    }

    this.loading = true;
    this.error = '';

    // Aqui você faria a chamada ao backend
    // this.authService.registerAluno({nome, email, senha}).subscribe(...)
    console.log('Registrando aluno:', {
      nome: this.nome,
      email: this.email,
      tipo: 'aluno'
    });

    // Simular sucesso
    setTimeout(() => {
      this.loading = false;
      this.success = true;
      setTimeout(() => {
        this.router.navigate(['/lojas']);
      }, 2000);
    }, 1500);
  }

  goBack(): void {
    this.router.navigate(['/auth/register']);
  }
}
