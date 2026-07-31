import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { recuperarBuildVencido } from './core/recuperar-build-vencido';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html'
})
export class AppComponent {
  title = 'Cursaas EAD';

  constructor() {
    // Aqui, e não num APP_INITIALIZER: injetar o Router durante a inicialização
    // da aplicação arrisca dependência cíclica de DI. O componente raiz é
    // construído antes de qualquer navegação terminar, então nenhum evento de
    // NavigationError se perde.
    recuperarBuildVencido(inject(Router))();
  }
}
