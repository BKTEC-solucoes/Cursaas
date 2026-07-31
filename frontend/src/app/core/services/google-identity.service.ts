import { Injectable, NgZone } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Integração com o Google Identity Services (GIS).
 *
 * O side-car Node (`POST /auth/google`) espera um **idToken** — ele chama
 * `OAuth2Client.verifyIdToken`. Quem obtém esse token é o navegador, falando
 * direto com o Google; o backend nunca participa do handshake e por isso não
 * precisa de client secret.
 *
 * O script é carregado sob demanda, não pelo `index.html`, por dois motivos:
 * toda instituição que não usa login Google deixa de baixar um script de
 * terceiros, e nenhuma requisição ao Google entra no caminho crítico do primeiro
 * render — que já é disputado pela aplicação do tema.
 */

/** Payload do callback do GIS. `credential` é o idToken (JWT do Google). */
interface CredencialGoogle {
  credential: string;
  select_by?: string;
}

/**
 * Superfície mínima do `window.google.accounts.id` que usamos.
 *
 * Declarada à mão em vez de instalar `@types/google.accounts`: são três métodos
 * e a dependência traria a API inteira do GIS para uma tela só.
 */
interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (resposta: CredencialGoogle) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }): void;
  renderButton(
    elemento: HTMLElement,
    opcoes: {
      type?: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with';
      shape?: 'rectangular' | 'pill';
      width?: number;
      locale?: string;
    },
  ): void;
  disableAutoSelect(): void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }
}

const URL_SCRIPT_GIS = 'https://accounts.google.com/gsi/client';

@Injectable({ providedIn: 'root' })
export class GoogleIdentityService {
  /**
   * Carregamento é uma promise única e memorizada: a tela de login pode ser
   * montada mais de uma vez por sessão (logout e volta), e sem isso cada
   * montagem injetaria outra `<script>`.
   */
  private carregamento?: Promise<GoogleAccountsId>;

  constructor(private zone: NgZone) {}

  /**
   * True quando o client ID foi realmente preenchido.
   *
   * O placeholder termina com o mesmo sufixo de um ID real, então checar só o
   * sufixo não basta — daí a segunda condição.
   */
  configurado(): boolean {
    const clientId = environment.googleClientId?.trim() || '';
    return (
      clientId.endsWith('.apps.googleusercontent.com') &&
      !clientId.includes('SEU_GOOGLE_CLIENT_ID')
    );
  }

  /**
   * Renderiza o botão oficial do Google dentro de `container`.
   *
   * Usamos o botão renderizado pelo GIS, e não um botão próprio, porque é o
   * único caminho suportado para obter um idToken a partir de um clique: o One
   * Tap (`prompt()`) é suprimido depois de algumas dispensas e não serve como
   * ação de botão. As diretrizes de marca do Google também exigem o botão deles.
   *
   * `onCredencial` recebe o idToken já de volta na zona do Angular — o callback
   * do GIS vem de fora dela, e sem `zone.run` a tela não re-renderiza.
   */
  async renderizarBotao(
    container: HTMLElement,
    onCredencial: (idToken: string) => void,
    opcoes: { modoEscuro?: boolean; largura?: number } = {},
  ): Promise<void> {
    const id = await this.carregar();

    id.initialize({
      client_id: environment.googleClientId.trim(),
      callback: (resposta) => {
        if (!resposta?.credential) {
          return;
        }
        this.zone.run(() => onCredencial(resposta.credential));
      },
      // Sem login automático: numa tela de login compartilhada (laboratório,
      // secretaria) entrar sozinho na conta do usuário anterior é um risco.
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    container.innerHTML = '';
    id.renderButton(container, {
      type: 'standard',
      theme: opcoes.modoEscuro ? 'filled_black' : 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      width: opcoes.largura ?? 320,
      locale: 'pt-BR',
    });
  }

  /** Esquece a conta selecionada, para o próximo login voltar a perguntar. */
  encerrarSessaoGoogle(): void {
    window.google?.accounts?.id?.disableAutoSelect();
  }

  private carregar(): Promise<GoogleAccountsId> {
    if (this.carregamento) {
      return this.carregamento;
    }

    this.carregamento = new Promise<GoogleAccountsId>((resolve, reject) => {
      const pronto = () => {
        const id = window.google?.accounts?.id;
        if (id) {
          resolve(id);
        } else {
          reject(new Error('GIS carregou mas window.google.accounts.id não existe'));
        }
      };

      // O script pode já estar na página se outra tela o carregou antes.
      const existente = document.querySelector<HTMLScriptElement>(
        `script[src="${URL_SCRIPT_GIS}"]`,
      );
      if (existente) {
        if (window.google?.accounts?.id) {
          pronto();
        } else {
          existente.addEventListener('load', pronto, { once: true });
          existente.addEventListener(
            'error',
            () => reject(new Error('Falha ao carregar o script do Google')),
            { once: true },
          );
        }
        return;
      }

      const script = document.createElement('script');
      script.src = URL_SCRIPT_GIS;
      script.async = true;
      script.defer = true;
      script.onload = pronto;
      script.onerror = () =>
        reject(new Error('Falha ao carregar o script do Google'));
      document.head.appendChild(script);
    });

    // Uma falha de rede não pode envenenar o cache: sem isso, a primeira falha
    // deixaria o botão quebrado até recarregar a página inteira.
    this.carregamento.catch(() => {
      this.carregamento = undefined;
    });

    return this.carregamento;
  }
}
