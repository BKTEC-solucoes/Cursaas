import { Router, NavigationError } from '@angular/router';

/**
 * Recarrega a página quando a navegação falha por bundle vencido.
 *
 * Cenário: a aba está aberta desde antes de um deploy. O `index.html` que ela
 * carregou aponta para chunks com os hashes antigos; o deploy trocou todos. Na
 * primeira navegação para uma rota lazy (`/admin`, `/aluno`, `/instituicao`) o
 * import dinâmico busca um arquivo que não existe mais, falha, e o router
 * emite NavigationError — a navegação simplesmente não acontece, sem erro na
 * tela. Foi assim que um login bem-sucedido ficou preso na tela de login.
 *
 * Recarregar resolve porque o `index.html` é servido com `no-store`
 * (docker/nginx/spa.conf): o reload traz a lista nova de hashes.
 *
 * Só trata falha de carregamento de módulo. NavigationError também cobre guard
 * que lançou exceção e resolver que quebrou — recarregar nesses casos só
 * esconderia o bug de quem precisa vê-lo.
 */

const CHAVE_ULTIMO_RELOAD = 'reload_build_vencido_ts';

/** Janela mínima entre dois reloads automáticos. */
const INTERVALO_MINIMO_MS = 15_000;

/**
 * O texto varia conforme o bundler e o navegador; não há tipo de erro estável
 * para checar. Angular 18 usa esbuild com `import()` nativo, então o Chrome
 * produz "Failed to fetch dynamically imported module" e o Firefox "error
 * loading dynamically imported module". As duas primeiras entradas cobrem o
 * webpack, ainda emitido por dependências que fazem o próprio code splitting.
 */
const SINAIS_DE_CHUNK = [
  'ChunkLoadError',
  'Loading chunk',
  'dynamically imported module',
  'Importing a module script failed',
];

function ehFalhaDeChunk(erro: unknown): boolean {
  const texto = `${(erro as Error)?.name ?? ''} ${(erro as Error)?.message ?? erro ?? ''}`;
  return SINAIS_DE_CHUNK.some((sinal) => texto.includes(sinal));
}

export function recuperarBuildVencido(router: Router): () => void {
  return () => {
    router.events.subscribe((evento) => {
      if (!(evento instanceof NavigationError) || !ehFalhaDeChunk(evento.error)) {
        return;
      }

      // Se o reload não resolver (chunk realmente ausente do servidor, e não
      // apenas vencido), sem esta trava a página entraria em loop de refresh.
      const ultimo = Number(sessionStorage.getItem(CHAVE_ULTIMO_RELOAD) ?? 0);
      if (Date.now() - ultimo < INTERVALO_MINIMO_MS) {
        console.error(
          '[build-vencido] recarregar não resolveu; a rota segue inacessível:',
          evento.error,
        );
        return;
      }

      sessionStorage.setItem(CHAVE_ULTIMO_RELOAD, String(Date.now()));

      // `evento.url` e não `location.reload()`: a navegação falhou, então a
      // barra de endereços ainda mostra a URL anterior. Recarregar por ela
      // devolveria o usuário para a tela de onde ele saiu — no caso do login,
      // de volta ao login, que é exatamente o sintoma que isto conserta.
      location.assign(evento.url);
    });
  };
}
