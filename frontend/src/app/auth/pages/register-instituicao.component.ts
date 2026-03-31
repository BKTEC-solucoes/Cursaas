import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

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

  constructor(private router: Router, private authService: AuthService) {}

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

    // Preparar dados para enviar
    const dadosInstituicao = {
      nome_instituicao: this.nomeInstituicao,
      cnpj: this.cnpj.replace(/\D/g, ''),
      email: this.email,
      endereco: this.endereco,
      nome_responsavel: this.nomeResponsavel,
      contato_responsavel: this.telefonResponsavel.replace(/\D/g, ''),
      senha: this.senha
    };

    // Chamar serviço de autenticação
    this.authService.registrarInstituicao(dadosInstituicao).subscribe({
      next: (response) => {
        this.loading = false;
        this.success = true;
        
        // Redirecionar para dashboard após 2 segundos
        setTimeout(() => {
          this.router.navigate(['/admin/dashboard']);
        }, 2000);
      },
      error: (error) => {
        this.loading = false;
        
        if (error.error?.detail) {
          this.error = Array.isArray(error.error.detail) 
            ? error.error.detail[0]?.msg || error.error.detail[0] 
            : error.error.detail;
        } else if (error.error?.message) {
          this.error = error.error.message;
        } else {
          this.error = 'Erro ao registrar instituição. Tente novamente.';
        }
        
        console.error('Erro no registro:', error);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/auth/register']);
  }
}
