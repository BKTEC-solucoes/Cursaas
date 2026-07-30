import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Carrega vídeos de aula a partir de `GET /api/aulas/video/{filename}`.
 *
 * Esse endpoint exige `Authorization: Bearer` e checa o tenant do curso dono do
 * vídeo. Como `<video src="...">` não envia headers, o arquivo precisa passar
 * pelo HttpClient (que passa pelo authInterceptor) e ser reproduzido a partir de
 * uma object URL.
 *
 * ⚠️ Consequência do download via XHR: o vídeo é baixado por INTEIRO antes de
 * começar a tocar — sem range requests, sem seek durante o carregamento — e o
 * blob fica em memória. Para arquivos grandes (MAX_FILE_SIZE no backend admite
 * até 500 MB) isso é pesado. Se virar problema, a saída é troca de arquitetura:
 * URL assinada de curta duração ou cookie de sessão só para mídia.
 */
@Injectable({ providedIn: 'root' })
export class VideoService {
  private readonly cache = new Map<string, Observable<string>>();
  private readonly objectUrls = new Set<string>();

  constructor(private http: HttpClient) {}

  /** Extrai o nome do arquivo de um `caminho_arquivo` (separador varia com o SO). */
  static nomeArquivo(caminho: string): string {
    return (caminho ?? '').replace(/\\/g, '/').split('/').pop() ?? '';
  }

  /**
   * Devolve uma object URL pronta para `<video [src]>`.
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
        .get(`${environment.apiUrl}/aulas/video/${encodeURIComponent(nome)}`, {
          responseType: 'blob',
        })
        .pipe(
          map((blob) => {
            const url = URL.createObjectURL(blob);
            this.objectUrls.add(url);
            return url;
          }),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
      this.cache.set(nome, stream);
    }
    return stream;
  }

  /**
   * Revoga as object URLs criadas e limpa o cache.
   * Chame no `ngOnDestroy` das telas que exibem vídeo — sem isso os blobs ficam
   * retidos em memória pelo resto da sessão.
   */
  liberar(): void {
    this.objectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.objectUrls.clear();
    this.cache.clear();
  }
}
