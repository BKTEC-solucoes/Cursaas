import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { InstituicaoService } from '../../../shared/services/instituicao.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-criar-instituicao',
  templateUrl: './criar-instituicao.component.html',
  styleUrls: ['./criar-instituicao.component.css']
})
export class CriarInstituicaoComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private instituicaoService: InstituicaoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.criarFormulario();
  }

  /**
   * Cria o formulário com validações
   */
  private criarFormulario(): void {
    this.form = this.fb.group(
      {
        nome_instituicao: ['', [Validators.required, Validators.minLength(3)]],
        cnpj: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        nome_responsavel: ['', [Validators.required, Validators.minLength(3)]],
        contato_responsavel: ['', [Validators.required, Validators.minLength(10)]],
        endereco: ['', [Validators.required, Validators.minLength(5)]],
        senha: ['', [Validators.required, Validators.minLength(6)]],
        confirmarSenha: ['', [Validators.required]]
      },
      { validators: this.senhasCorrespondem.bind(this) }
    );
  }

  /**
   * Validador customizado: verifica se as senhas correspondem
   */
  senhasCorrespondem(control: AbstractControl): ValidationErrors | null {
    const senha = control.get('senha');
    const confirmarSenha = control.get('confirmarSenha');

    if (senha && confirmarSenha && senha.value !== confirmarSenha.value) {
      confirmarSenha.setErrors({ senhasNaoCorrespondem: true });
      return { senhasNaoCorrespondem: true };
    } else if (confirmarSenha?.hasError('senhasNaoCorrespondem')) {
      confirmarSenha.setErrors(null);
    }

    return null;
  }

  /**
   * Formata CNPJ automaticamente enquanto o usuário digita
   */
  formatarCNPJ(): void {
    const cnpjControl = this.form.get('cnpj');
    if (cnpjControl) {
      let valor = cnpjControl.value.replace(/\D/g, '');

      if (valor.length > 14) {
        valor = valor.slice(0, 14);
      }

      // Aplicar máscara: XX.XXX.XXX/XXXX-XX
      if (valor.length === 14) {
        const formatado = `${valor.slice(0, 2)}.${valor.slice(2, 5)}.${valor.slice(5, 8)}/${valor.slice(8, 12)}-${valor.slice(12, 14)}`;
        cnpjControl.setValue(formatado, { emitEvent: false });
      }
    }
  }

  /**
   * Submete o formulário
   */
  submit(): void {
    if (this.form.invalid) {
      this.mostrarErro('Preencha todos os campos corretamente');
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Preparar dados (remover campo de confirmação de senha)
    const { confirmarSenha, contato_responsavel, ...dadosBase } = this.form.value;
    const dados = {
      ...dadosBase,
      contato: contato_responsavel,
    };

    this.instituicaoService.registrarInstituicao(dados).subscribe({
      next: (response) => {
        this.successMessage = 'Instituição criada com sucesso! Redirecionando...';
        this.loading = false;

        setTimeout(() => {
          // Redirecionar para dashboard
          this.router.navigate(['/admin/dashboard']);
        }, 2000);
      },
      error: (error) => {
        this.loading = false;
        this.mostrarErro(error.message || 'Erro ao criar instituição');
      }
    });
  }

  /**
   * Mostra mensagem de erro
   */
  private mostrarErro(mensagem: string): void {
    this.errorMessage = mensagem;
    setTimeout(() => {
      this.errorMessage = '';
    }, 5000);
  }

  /**
   * Getter para validações do template
   */
  get cnpjInvalido(): boolean {
    const control = this.form.get('cnpj');
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  get emailInvalido(): boolean {
    const control = this.form.get('email');
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  get senhasCorrespondemVal(): boolean {
    return this.form.hasError('senhasNaoCorrespondem');
  }
}
