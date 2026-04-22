# Componente de Upload de Vídeo Moderno

## 📋 Visão Geral

O `VideoUploadComponent` é um componente Angular standalone moderno e intuitivo que permite aos usuários adicionar vídeos de duas formas:

1. **Via URL do YouTube** - Colar link e visualizar preview
2. **Via Upload Local** - Arrastar e soltar ou selecionar arquivo

## ✨ Funcionalidades Principais

### YouTube
- ✅ Validação de URL em tempo real
- ✅ Preview com thumbnail do vídeo
- ✅ Suporte para:
  - `youtube.com/watch?v=ID`
  - `youtu.be/ID`
  - `youtube.com/shorts/ID`

### Upload Local
- ✅ Drag-and-drop de arquivos
- ✅ Seleção por clique
- ✅ Barra de progresso em tempo real
- ✅ Formatos aceitos: MP4, WebM, OGG
- ✅ Limite de tamanho: 500MB
- ✅ Feedback visual detalhado

### Gerenciamento
- ✅ Suporte a múltiplos vídeos
- ✅ Previsão de miniaturas
- ✅ Remoção de vídeos
- ✅ Interface intuitiva com abas
- ✅ Mensagens de erro amigáveis

## 🚀 Como Usar

### 1. Importar o Componente

```typescript
import { VideoUploadComponent } from '@shared/components';

@Component({
  selector: 'app-meu-componente',
  standalone: true,
  imports: [VideoUploadComponent],
  template: `
    <app-video-upload
      [aulaId]="123"
      (videosAdicionados)="onVideosAdicionados($event)"
      (videoRemovido)="onVideoRemovido()"
    ></app-video-upload>
  `
})
export class MeuComponente {
  onVideosAdicionados(videos: Video[]): void {
    console.log('Vídeos adicionados:', videos);
    // Salvar vídeos
  }

  onVideoRemovido(): void {
    console.log('Vídeo removido');
  }
}
```

### 2. Interfaces

```typescript
export interface Video {
  id?: string;
  tipo: 'youtube' | 'upload';
  url: string;
  titulo?: string;
  thumbnail?: string;      // URL da miniatura
  tamanho?: number;         // Tamanho em bytes (para uploads)
  duracao?: number;         // Duração em segundos
}
```

### 3. Componente Wrapper

Para integração no sistema de blocos de aulas, use o `BlocoVideoModernoComponent`:

```typescript
import { BlocoVideoModernoComponent } from '@shared/components';

@Component({
  selector: 'app-aula-form',
  standalone: true,
  imports: [BlocoVideoModernoComponent],
  template: `
    <app-bloco-video-moderno
      [aulaId]="aulaId"
      [conteudo]="conteudoVideos"
      (conteudoChange)="onConteudoChange($event)"
    ></app-bloco-video-moderno>
  `
})
export class AulaFormComponent {
  aulaId = 123;
  conteudoVideos = '[]'; // JSON string

  onConteudoChange(novoConteudo: string): void {
    const videos: Video[] = JSON.parse(novoConteudo);
    console.log('Vídeos atualizados:', videos);
  }
}
```

## 🎨 Customização

### Estilos

O componente usa classes CSS customizáveis. Você pode sobrescrever cores através de CSS variables:

```css
:root {
  --primary-color: #3b82f6;
  --success-color: #10b981;
  --error-color: #ef4444;
  --border-color: #e2e8f0;
}
```

### Props

| Prop | Tipo | Descrição |
|------|------|-----------|
| `aulaId` | `number` | ID da aula para uploads |
| `videosAdicionados` | `EventEmitter<Video[]>` | Emitido quando vídeos são adicionados |
| `videoRemovido` | `EventEmitter<void>` | Emitido quando um vídeo é removido |

## 🔌 Integração com Backend

O componente faz requisições para:

```
POST /api/aulas/{aulaId}/videos
Envia: FormData com arquivo
Retorna: { video_url, file_size }

DELETE /api/aulas/{aulaId}/videos/{videoId}
Remove vídeo do servidor
```

## UX/UI Highlights

- 📱 **Responsivo** - Design mobile-first
- ♿ **Acessível** - Suporte a navegação por teclado
- 🎯 **Intuitivo** - Abas claras e feedback visual
- 🚀 **Rápido** - Validações em tempo real
- 🎓 **Educacional** - Mensagens de erro úteis

## 📦 Estrutura de Arquivos

```
frontend/src/app/shared/components/
├── video-upload.component.ts          // Componente principal
├── bloco-video-moderno.component.ts   // Wrapper para blocos
├── index.ts                           // Exports
└── [outros componentes]
```

## 🧪 Teste Local

1. Abra `http://localhost:4200/admin/aulas/new`
2. Clique em "+ Vídeo" na barra de ferramentas
3. Teste ambas abas:
   - Colar URL do YouTube
   - Fazer upload de arquivo MP4

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| Upload falha | Verifique tamanho do arquivo (máx. 500MB) |
| YouTube não funciona | Use URL válida (youtube.com ou youtu.be) |
| Estilos não aparecem | Importe o componente com `standalone: true` |

## 📝 Notas Desenvolvedor

- O componente usa RxJS com `takeUntil` para cleanup
- `ChangeDetectionStrategy.OnPush` para otimização
- Validação de tipo MIME no backend recomendada
- Implemente rate limiting em produção

## 🔄 Fluxo de Dados

```
Usuário                 Componente              Backend API
   |                         |                       |
   |---(seleciona arquivo)-->|                       |
   |                         |---(POST FormData)---->|
   |                    (progresso)                  |
   |<---(progresso em %)-----|<---(HTTP Progress)---|
   |                         |                       |
   |                         |<---(video_url)--------|
   |                         |                       |
   |---(emite evento)------->|
   |                         |
   |---(renderiza lista)---->|
```

## 📚 Exemplo Completo

```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoUploadComponent, Video } from '@shared/components';

@Component({
  selector: 'app-aula-editor',
  standalone: true,
  imports: [CommonModule, VideoUploadComponent],
  template: `
    <div class="aula-editor">
      <h2>Editar Aula</h2>
      
      <app-video-upload
        [aulaId]="aulaId"
        (videosAdicionados)="salvarVideos($event)"
        (videoRemovido)="onRemovido()"
      ></app-video-upload>

      <div *ngIf="videosSalvos" class="success">
        ✓ {{ videosSalvos }} vídeo(s) salvo(s)!
      </div>
    </div>
  `,
  styles: [`
    .aula-editor { padding: 20px; }
    .success { 
      margin-top: 20px; 
      padding: 12px;
      background: #d1fae5;
      color: #065f46;
      border-radius: 6px;
    }
  `]
})
export class AulaEditorComponent implements OnInit {
  aulaId = 1;
  videosSalvos = 0;

  ngOnInit(): void {
    // Carregar aula
  }

  salvarVideos(videos: Video[]): void {
    this.videosSalvos = videos.length;
    console.log('Salvando vídeos:', videos);
    // Integrar com backend
  }

  onRemovido(): void {
    console.log('Vídeo removido');
  }
}
```

---

**Versão**: 1.0.0  
**Última atualização**: 2026-04-07  
**Suporte**: Contate a equipe de desenvolvimento
