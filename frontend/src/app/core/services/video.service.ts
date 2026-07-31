import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Resolve a URL de reprodução de um vídeo de aula.
 *
 * Pede a autorização a `GET /api/aulas/video/{filename}/url` — que passa pelo
 * authInterceptor, checa o tenant do curso dono do vídeo e devolve uma URL
 * assinada de curta duração. Essa URL vai direto no `<video [src]>`.
 *
 * A troca em relação ao download por XHR: o navegador passa a fazer range
 * request no arquivo, então o vídeo começa a tocar na hora e aceita seek, em vez
 * de baixar os (até 500 MB) inteiros para a memória antes do primeiro frame. O
 * byte também deixa de sair pelo processo Python — o nginx entrega via
 * X-Accel-Redirect. Ver `app/services/video_url.py` no backend.
 */
@Injectable({ providedIn: 'root' })
export class VideoService {
  private readonly cache = new Map<string, Observable<string>>();

  constructor(private http: HttpClient) {}

  /** Extrai o nome do arquivo de um `caminho_arquivo` (separador varia com o SO). */
  static nomeArquivo(caminho: string): string {
    return (caminho ?? '').replace(/\\/g, '/').split('/').pop() ?? '';
  }

  /**
   * Devolve uma URL pronta para `<video [src]>`.
   * Aceita tanto o `caminho_arquivo` completo quanto só o nome do arquivo.
   */
  carregar(caminhoOuNome: string): Observable<string> {
    const nome = VideoService.nomeArquivo(caminhoOuNome);
    if (!nome) {
      return of('');
    }

    let stream = this.cache.get(nome);
    if (!stream) {
      stream = this.http
        .get<{ url: string }>(
          `${environment.apiUrl}/aulas/video/${encodeURIComponent(nome)}/url`,
        )
        .pipe(
          // O backend devolve o caminho relativo à base da API de propósito:
          // atrás do nginx ele não tem como saber o hostname público. Quem sabe
          // é o environment — absoluto no `ng serve`, relativo no build de prod.
          map((resposta) => `${environment.apiUrl}${resposta.url}`),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
      this.cache.set(nome, stream);
    }
    return stream;
  }

  /**
   * Limpa o cache de URLs.
   *
   * Continua valendo a pena chamar no `ngOnDestroy`: as URLs assinadas expiram
   * (`VIDEO_URL_TTL_SECONDS`, 15 min por padrão) e uma URL cacheada além disso
   * faria o player falhar com 403. Descartar ao sair da tela garante que a
   * próxima visita assine de novo.
   *
   * Não há mais object URL para revogar — sem blob, não há o que vazar.
   */
  liberar(): void {
    this.cache.clear();
  }
}
