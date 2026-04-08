# Exemplo de Integração do Video Upload Component

Este arquivo mostra como integrar o novo `VideoUploadComponent` no `aula-form.component.ts` para substituir o `BlocoVideoComponent` antigo ou mantê-lo como uma opção alternativa.

## PASSO 1: Importar os novos componentes

```typescript
import { 
  BlocoVideoModernoComponent,
  VideoUploadComponent,
  Video 
} from '@shared/components';
```

## PASSO 2: Adicionar ao imports do componente

No `@Component` decorator:

```typescript
imports: [
  CommonModule, 
  FormsModule, 
  RouterModule, 
  BlocoTextoComponent, 
  BlocoVideoComponent,  // Manter para retro-compatibilidade
  RichTextEditorComponent,
  BlocoVideoModernoComponent,  // Novo!
  VideoUploadComponent  // Novo!
],
```

## PASSO 3: Adicionar tipo de bloco no TipoBloco

Se usar um novo tipo:

```typescript
type TipoBloco = 'titulo' | 'texto' | 'video' | 'video-moderno';
```

## PASSO 4: Adicionar botão no toolbar

Template no toolbar:

```html
<div class="editor-toolbar">
  <span class="toolbar-label">Conteúdo</span>
  <button type="button" (click)="adicionar('titulo')">+ Título</button>
  <button type="button" (click)="adicionar('texto')">+ Texto</button>
  <button type="button" (click)="adicionar('video')">+ Vídeo (antigo)</button>
  <button type="button" (click)="adicionar('video-moderno')">+ Vídeo Moderno</button>
</div>
```

## PASSO 5: Adicionar renderização no template

Adicionar após o bloco de vídeo antigo:

```html
<app-bloco-video-moderno
  *ngIf="b.tipo === 'video-moderno'"
  [conteudo]="b.conteudo"
  [aulaId]="aulaId"
  (conteudoChange)="atualizar(b.id, $event)"
  class="bloco-content"
/>
```

## PASSO 6: Exemplo completo de template atualizado

```html
<div class="form-page">
  <!-- Cabeçalho -->
  <div class="form-topbar">
    <button class="btn-voltar" (click)="voltar()">← Voltar</button>
    <h2>{{ aulaId ? '✏️ Editar Aula' : '📚 Nova Aula' }}</h2>
    <div class="topbar-actions">
      <button class="btn-secondary" (click)="voltar()" [disabled]="salvando">Cancelar</button>
      <button class="btn-primary" (click)="salvar()" [disabled]="salvando">
        <span *ngIf="salvando" class="spinner"></span>
        {{ salvando ? 'Salvando...' : '💾 Salvar Aula' }}
      </button>
    </div>
  </div>

  <div class="form-body" *ngIf="!carregando; else loadingTpl">
    <div class="editor-col">
      <div class="editor-toolbar">
        <span class="toolbar-label">Conteúdo</span>
        <button type="button" (click)="adicionar('titulo')">+ Título</button>
        <button type="button" (click)="adicionar('texto')">+ Texto</button>
        <!-- Alterar para usar novo tipo -->
        <button type="button" (click)="adicionar('video-moderno')">
          🎬 + Vídeo
        </button>
      </div>

      <div class="blocos-list">
        <!-- Blocos existentes -->
        <ng-container *ngFor="let b of blocos; let i = index; trackBy: trackById">
          <div class="bloco-row">
            <app-bloco-texto
              *ngIf="b.tipo === 'titulo'"
              [conteudo]="b.conteudo"
              [tipo]="b.tipo"
              (conteudoChange)="atualizar(b.id, $event)"
              class="bloco-content"
            />

            <app-rich-text-editor
              *ngIf="b.tipo === 'texto'"
              [content]="b.conteudo"
              placeholder="Digite um parágrafo..."
              (contentChange)="atualizar(b.id, $event)"
              class="bloco-content"
            />

            <!-- Novo componente de vídeo moderno -->
            <app-bloco-video-moderno
              *ngIf="b.tipo === 'video-moderno'"
              [conteudo]="b.conteudo"
              [aulaId]="aulaId"
              (conteudoChange)="atualizar(b.id, $event)"
              class="bloco-content"
            />

            <!-- Manter componente antigo para retro-compatibilidade -->
            <app-bloco-video
              *ngIf="b.tipo === 'video'"
              [conteudo]="b.conteudo"
              (conteudoChange)="atualizar(b.id, $event)"
              [aulaId]="aulaId"
              [videoUploadUrl]="videoAtual"
              [videoUploadId]="videoId"
              (uploadConcluido)="onUploadConcluido($event)"
              (uploadRemovido)="onUploadRemovido()"
              class="bloco-content"
            />

            <button
              class="btn-remover"
              title="Remover bloco"
              (click)="remover(b.id)"
              [disabled]="isTituloUnico(b)"
            >×</button>
          </div>
        </ng-container>
      </div>
    </div>
  </div>
</div>
```

## PASSO 7: Atualizar método parseBlocos se necessário

```typescript
export function parseBlocos(titulo: string, descricao: string): any[] {
  try {
    const parsed = JSON.parse(descricao ?? '');
    if (Array.isArray(parsed) && parsed.length > 0 && 'tipo' in parsed[0]) {
      return parsed;
    }
  } catch { /* não é JSON */ }

  const blocos: any[] = [
    { id: 1, tipo: 'titulo', conteudo: titulo ?? '' },
  ];
  
  if (descricao) {
    // Se iniciar com '[', é JSON de vídeos (novo formato)
    if (descricao.trim().startsWith('[')) {
      blocos.push({ 
        id: 2, 
        tipo: 'video-moderno', 
        conteudo: descricao 
      });
    } else {
      // Formato antigo de texto
      blocos.push({ id: 2, tipo: 'texto', conteudo: descricao });
    }
  }
  
  return blocos;
}
```

## PASSO 8: Usar o novo componente diretamente (alternativa)

Se preferir usar o `VideoUploadComponent` diretamente sem o wrapper:

```html
<app-video-upload
  [aulaId]="aulaId"
  (videosAdicionados)="onVideosAdicionados($event)"
  (videoRemovido)="onVideoRemovido()"
></app-video-upload>
```

Com métodos correspondentes:

```typescript
onVideosAdicionados(videos: Video[]): void {
  // Serializar para JSON
  const json = JSON.stringify(videos);
  // Salvar no conteúdo do bloco
  this.atualizar(blocoId, json);
}

onVideoRemovido(): void {
  // Recalcular
}
```

## PASSO 9: Considerações de Retro-compatibilidade

**Recomendações:**

1. **MANTER O COMPONENTE ANTIGO**
   - Não remova `BlocoVideoComponent` imediatamente
   - Mantenha suporte a blocos 'video' existentes
   - Apresente ambas as opções no toolbar

2. **MIGRAÇÃO GRADUAL**
   - Novos blocos usam 'video-moderno'
   - Blocos antigos continuam funcionando com 'video'
   - Adicione opção de converter/migrar depois

3. **FORMATO DE DADOS**
   - Vídeo antigo: URL simples string ou JSON com videoId
   - Vídeo moderno: Array de `Video[]` serializado como JSON
   - Adicione verificação no parseBlocos para ambos formatos

4. **TESTES**
   - Teste com aulas existentes (sem quebrar)
   - Teste novo componente em contexto vazio
   - Teste migração de dados

## PASSO 10: Exemplo de verificação de compatibilidade

```typescript
export function detectarTipoVideo(conteudo: string): 'antigo' | 'moderno' {
  try {
    // Se for um JSON array, é novo formato
    if (conteudo.trim().startsWith('[')) {
      const parsed = JSON.parse(conteudo);
      if (Array.isArray(parsed) && parsed[0]?.tipo) {
        return 'moderno';
      }
    }
    // Formato antigo (string simples ou JSON com campos diferentes)
    return 'antigo';
  } catch {
    return 'antigo';
  }
}
```

## CHECKLIST DE INTEGRAÇÃO

- ✓ Importar componentes (VideoUploadComponent, BlocoVideoModernoComponent)
- ✓ Adicionar no imports do @Component
- ✓ Adicionar botão no toolbar
- ✓ Adicionar template de renderização
- ✓ Atualizar parseBlocos para novo formato
- ✓ Adicionar tipos TypeScript
- ✓ Testar com aulas novas
- ✓ Testar com aulas existentes
- ✓ Verificar compatibilidade com backend
- ✓ Adicionar documentação para usuários
- ✓ Deploy em staging antes de produção
