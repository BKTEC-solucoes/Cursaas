import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface Loja {
  id: number;
  nome: string;
  email: string;
  cidade: string;
}

@Component({
  selector: 'app-lojas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lojas.component.html',
  styleUrls: ['./lojas.component.css']
})
export class LojasComponent implements OnInit {
  lojas: Loja[] = [
    {
      id: 1,
      nome: 'Universidade Federal de São Paulo',
      email: 'contato@unifesp.edu.br',
      cidade: 'São Paulo'
    },
    {
      id: 2,
      nome: 'Instituto Federal de Educação Técnica',
      email: 'contato@ifet.edu.br',
      cidade: 'Rio de Janeiro'
    },
    {
      id: 3,
      nome: 'Faculdade de Tecnologia Avançada',
      email: 'contato@fatec.edu.br',
      cidade: 'Belo Horizonte'
    },
    {
      id: 4,
      nome: 'Centro Universitário de Brasília',
      email: 'contato@unb.edu.br',
      cidade: 'Brasília'
    },
    {
      id: 5,
      nome: 'Universidade Estadual de Campinas',
      email: 'contato@unicamp.edu.br',
      cidade: 'Campinas'
    },
    {
      id: 6,
      nome: 'Instituto de Educação Superior do Nordeste',
      email: 'contato@iesne.edu.br',
      cidade: 'Recife'
    }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    console.log('Lojas carregadas:', this.lojas);
  }

  abrirLoja(loja: Loja): void {
    console.log('Abrindo loja:', loja);
    // Aqui você poderia navegar para a página da loja
    // this.router.navigate(['/loja', loja.id]);
  }

  logout(): void {
    this.router.navigate(['/auth/login']);
  }
}
