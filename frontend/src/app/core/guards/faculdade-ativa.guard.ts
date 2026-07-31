import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { FaculdadeAtivaService } from '../services/faculdade-ativa.service';

/**
 * Garante que o super admin tem uma instituição selecionada antes de abrir
 * qualquer tela de gestão (cursos, aulas, provas, notas, presença, alunos…).
 *
 * Sem isso essas telas mostravam os dados de todos os tenants misturados e
 * qualquer criação falhava por não saber a que faculdade pertencia o registro.
 * Se nada estiver selecionado, escolhe a primeira faculdade ativa; o cabeçalho
 * do painel permite trocar a qualquer momento.
 *
 * Admin comum passa direto — o tenant dele vem do vínculo, não da escolha.
 */
export const faculdadeAtivaGuard: CanActivateFn = () => {
  const faculdadeAtiva = inject(FaculdadeAtivaService);
  const router = inject(Router);

  if (!faculdadeAtiva.ehSuperAdmin()) return true;

  return faculdadeAtiva.garantirSelecao().pipe(
    map(id => {
      if (id !== null) return true;

      // Nenhuma faculdade ativa cadastrada: gerenciar o quê? Manda cadastrar.
      console.warn('[FaculdadeAtivaGuard] Nenhuma faculdade ativa disponível.');
      return router.createUrlTree(['/admin/instituicoes']);
    }),
  );
};
