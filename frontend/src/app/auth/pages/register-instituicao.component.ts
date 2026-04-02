import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-register-instituicao',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register-instituicao.component.html',
  styleUrls: ['./register-instituicao.component.css']
})
export class RegisterInstituicaoComponent {
  // Dados básicos
  nomeInstituicao = '';
  cnpj = '';
  email = '';
  
  // Localização
  endereco = '';
  
  // Contato do Responsável
  nomeResponsavel = '';
  telefonResponsavel = '';
  
  // Foto de Perfil
  fotoPerfil: File | null = null;
  fotoPreview: string | null = null;
  fotoSelecionada = false;
  
  // Segurança
  senha = '';
  confirmarSenha = '';
  showSenha = false;
  showConfirmarSenha = false;
  
  // Estados
  loading = false;
  error = '';
  success = false;

  constructor(private router: Router, private http: HttpClient) {}

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

  formatarTelefone(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length > 11) {
      value = value.slice(0, 11);
    }
    if (value.length <= 2) {
      this.telefonResponsavel = value;
    } else if (value.length <= 7) {
      this.telefonResponsavel = '(' + value.slice(0, 2) + ') ' + value.slice(2);
    } else {
      this.telefonResponsavel = '(' + value.slice(0, 2) + ') ' + value.slice(2, 7) + '-' + value.slice(7);
    }
  }

  onFotoSelecionada(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        this.error = 'Por favor, selecione um arquivo de imagem válido';
        return;
      }

      // Validar tamanho (máx 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.error = 'A imagem deve ter no máximo 5MB';
        return;
      }

      this.fotoPerfil = file;
      this.fotoSelecionada = true;
      this.error = '';

      // Criar preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.fotoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  register(): void {
    // Validar campos obrigatórios
    if (!this.nomeInstituicao || !this.cnpj || !this.email || !this.endereco || 
        !this.nomeResponsavel || !this.telefonResponsavel || !this.senha || !this.confirmarSenha) {
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

    const telefoneSemMascara = this.telefonResponsavel.replace(/\D/g, '');
    if (telefoneSemMascara.length < 10) {
      this.error = 'Telefone deve conter no mínimo 10 dígitos';
      return;
    }

    this.loading = true;
    this.error = '';

    const payload = {
      nome: this.nomeInstituicao,
      cnpj: cnpjSemMascara,
      email: this.email,
      descricao: `Responsável: ${this.nomeResponsavel} | Tel: ${this.telefonResponsavel} | Endereço: ${this.endereco}`,
    };

    this.http.post('http://localhost:8000/api/faculdades/', payload).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 5000);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.detail || 'Erro ao enviar solicitação. Tente novamente.';
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/auth/register']);
  }
}
