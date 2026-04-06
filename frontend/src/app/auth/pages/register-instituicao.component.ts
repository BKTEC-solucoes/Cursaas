import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register-instituicao',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register-instituicao.component.html',
  styleUrls: ['./register-instituicao.component.css']
})
export class RegisterInstituicaoComponent {
  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  nomeInstituicao = '';
  cnpj = '';
  email = '';
  endereco = '';
  nomeResponsavel = '';
  telefonResponsavel = '';

  fotoPerfil: File | null = null;
  fotoPreview: string | null = null;
  fotoSelecionada = false;

  senha = '';
  confirmarSenha = '';
  showSenha = false;
  showConfirmarSenha = false;

  loading = false;
  error = '';
  success = false;

  constructor(private router: Router, private authService: AuthService, private http: HttpClient) {}

  formatarCNPJ(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');

    if (value.length <= 2) {
      this.cnpj = value;
      return;
    }

    if (value.length <= 5) {
      this.cnpj = `${value.slice(0, 2)}.${value.slice(2)}`;
      return;
    }

    if (value.length <= 8) {
      this.cnpj = `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5)}`;
      return;
    }

    this.cnpj =
      `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5, 8)}` +
      `/${value.slice(8, 12)}-${value.slice(12)}`;
  }

  formatarTelefone(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');

    if (value.length > 11) {
      value = value.slice(0, 11);
    }

    if (value.length <= 2) {
      this.telefonResponsavel = value;
      return;
    }

    if (value.length <= 7) {
      this.telefonResponsavel = `(${value.slice(0, 2)}) ${value.slice(2)}`;
      return;
    }

    this.telefonResponsavel = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
  }

  onFotoSelecionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.error = 'Por favor, selecione um arquivo de imagem válido';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.error = 'A imagem deve ter no máximo 5MB';
      return;
    }

    this.fotoPerfil = file;
    this.fotoSelecionada = true;
    this.error = '';

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      this.fotoPreview = (loadEvent.target as FileReader).result as string;
    };
    reader.readAsDataURL(file);
  }

  register(): void {
    if (
      !this.nomeInstituicao ||
      !this.cnpj ||
      !this.email ||
      !this.endereco ||
      !this.nomeResponsavel ||
      !this.telefonResponsavel ||
      !this.senha ||
      !this.confirmarSenha
    ) {
      this.error = 'Todos os campos são obrigatórios';
      return;
    }

    if (!this.emailRegex.test(this.email.trim().toLowerCase())) {
      this.error = 'Informe um email válido';
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

    const telefoneSemMascara = this.telefonResponsavel.replace(/\D/g, '');
    if (telefoneSemMascara.length < 10) {
      this.error = 'Telefone deve conter no mínimo 10 dígitos';
      return;
    }

    this.loading = true;
    this.error = '';

    const dadosInstituicao = {
      nome: this.nomeInstituicao.trim(),
      cnpj: cnpjSemMascara,
      email: this.email.trim().toLowerCase(),
      descricao: `Responsável: ${this.nomeResponsavel} | Tel: ${this.telefonResponsavel} | Endereço: ${this.endereco}`
    };

    this.authService.registrarInstituicao(dadosInstituicao).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        this.router.navigate(['/admin/dashboard']);
      },
      error: (error) => {
        this.loading = false;

        if (error.error?.detail) {
          this.error = Array.isArray(error.error.detail)
            ? error.error.detail[0]?.msg || error.error.detail[0]
            : error.error.detail;
          return;
        }

        if (error.error?.message) {
          this.error = error.error.message;
          return;
        }

        this.error = 'Erro ao registrar instituição. Tente novamente.';
        console.error('Erro no registro:', error);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/auth/register']);
  }
}
