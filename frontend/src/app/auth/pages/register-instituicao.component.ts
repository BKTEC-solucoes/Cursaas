import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register-instituicao',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register-instituicao.component.html',
  styleUrls: ['./register-instituicao.component.css']
})
export class RegisterInstituicaoComponent {
  nomeInstituicao = '';
  cnpj = '';
  email = '';
  senha = '';
  confirmarSenha = '';
  showSenha = false;
  showConfirmarSenha = false;
  loading = false;
  error = '';
  success = false;

  constructor(private router: Router) {}

  formatarCNPJ(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length > 14) {
      value = value.slice(0, 14);
    }
    if (value.length <= 2) {
      this.cnpj = value;
    } else if (value.length <= 5) {
      this.cnpj = value.slice(0, 2) + '.' + value.slice(2);
    } else if (value.length <= 8) {
      this.cnpj = value.slice(0, 2) + '.' + value.slice(2, 5) + '.' + value.slice(5);
    } else {
      this.cnpj = value.slice(0, 2) + '.' + value.slice(2, 5) + '.' + value.slice(5, 8) + '/' + value.slice(8, 12) + '-' + value.slice(12);
    }
  }

  register(): void {
    if (!this.nomeInstituicao || !this.cnpj || !this.email || !this.senha || !this.confirmarSenha) {
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

    const cnpjSemMascara = this.cnpj.replace(/\D/g, '');
    if (cnpjSemMascara.length !== 14) {
      this.error = 'CNPJ deve conter 14 dígitos';
      return;
    }

    this.loading = true;
    this.error = '';

    // Aqui você faria a chamada ao backend
    // this.authService.registerInstituicao({nomeInstituicao, cnpj, email, senha}).subscribe(...)
    console.log('Registrando instituição:', {
      nomeInstituicao: this.nomeInstituicao,
      cnpj: this.cnpj,
      email: this.email,
      tipo: 'instituicao'
    });

    // Simular sucesso
    setTimeout(() => {
      this.loading = false;
      this.success = true;
      // Mostrar mensagem por 5 segundos antes de voltar
      setTimeout(() => {
        this.router.navigate(['/auth/login']);
      }, 5000);
    }, 1500);
  }

  goBack(): void {
    this.router.navigate(['/auth/register']);
  }
}
