import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import { IconComponent } from '../shared/components/icon.component';
@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.css']
})
export class LandingPageComponent {
  benefits = [
    {
      icon: 'graduation-cap',
      title: 'Aprendizado Estruturado',
      description: 'Cursos organizados por módulos com aulas em vídeo, materiais e avaliações em um só lugar.'
    },
    {
      icon: 'chart',
      title: 'Acompanhamento em Tempo Real',
      description: 'Monitore o progresso dos alunos, notas e frequência com relatórios detalhados.'
    },
    {
      icon: 'building',
      title: 'Gestão Institucional',
      description: 'Gerencie turmas, professores e alunos de forma centralizada e eficiente.'
    },
    {
      icon: 'smartphone',
      title: 'Acesso em Qualquer Dispositivo',
      description: 'Plataforma responsiva que funciona no computador, tablet e celular com total fluidez.'
    }
  ];

  constructor(private router: Router) {}

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }
}
