import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CadastroService, FaculdadePublica } from '../../core/services/cadastro.service';

@Component({
  selector: 'app-register-aluno',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register-aluno.component.html',
  styleUrls: ['./register-aluno.component.css']
})
export class RegisterAlunoComponent implements OnInit {
  nome = '';
  email = '';
  senha = '';
  confirmarSenha = '';
  faculdadeId: number | null = null;
  showSenha = false;
  showConfirmarSenha = false;
  loading = false;
  error = '';
  success = false;
  emailEmUso = false;
  validandoEmail = false;

  faculdades: FaculdadePublica[] = [];
  carregandoFaculdades = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private cadastroService: CadastroService,
  ) {}

  ngOnInit(): void {
    this.carregandoFaculdades = true;
    this.cadastroService.getFaculdadesPublicas().subscribe({
      next: (lista) => {
        this.faculdades = lista;
        this.carregandoFaculdades = false;
      },
      error: () => {
        this.carregandoFaculdades = false;
      }
    });
  }

  /**
   * Valida se o email já está registrado (chamada em tempo real)
   */
  verificarEmailDisponivel(): void {
    if (!this.email || this.email.length === 0) {
      this.emailEmUso = false;
      return;
    }

    this.validandoEmail = true;
    this.authService.checkEmailAvailability(this.email).subscribe({
      next: (response) => {
        this.emailEmUso = !response.disponivel;
        this.validandoEmail = false;
      },
      error: (error) => {
        console.error('Erro ao validar email:', error);
        this.validandoEmail = false;
        this.emailEmUso = false;
      }
    });
  }

  register(): void {
    // Validações obrigatórias
    if (!this.nome || !this.email || !this.senha || !this.confirmarSenha) {
      this.error = 'Todos os campos são obrigatórios';
      return;
    }

    if (!this.faculdadeId) {
      this.error = 'Selecione sua faculdade';
      return;
    }

    // Validar email
    if (this.emailEmUso) {
      this.error = 'Este email já está registrado';
      return;
    }

    // Validar format do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.error = 'Email inválido';
      return;
    }

    // Validar correspondência de senhas
    if (this.senha !== this.confirmarSenha) {
      this.error = 'As senhas não coincidem';
      return;
    }

    // Validar comprimento da senha
    if (this.senha.length < 6) {
      this.error = 'A senha deve ter no mínimo 6 caracteres';
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.register(this.nome, this.email, this.senha, this.faculdadeId).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;

        // Redirecionar ao catálogo após mostrar mensagem de aguardando aprovação
        setTimeout(() => {
          this.router.navigate(['/aluno/catalogo']);
        }, 3000);
      },
      error: (error) => {
        this.loading = false;

        if (error.status === 400) {
          this.error = error.error?.detail || 'Email já registrado';
        } else if (error.status === 404) {
          this.error = 'Faculdade não encontrada. Selecione outra.';
        } else if (error.status === 422) {
          this.error = 'Dados inválidos. Verifique os campos.';
        } else {
          this.error = error.error?.detail || 'Erro ao registrar. Tente novamente.';
        }

        console.error('Erro ao registrar:', error);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/auth/register']);
  }
}
