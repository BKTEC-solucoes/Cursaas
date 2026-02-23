import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'letra',
  standalone: true
})
export class LetraPipe implements PipeTransform {
  transform(valor: number): string {
    const letras = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    return letras[valor - 1] || '';
  }
}
