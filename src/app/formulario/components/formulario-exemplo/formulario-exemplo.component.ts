import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { InputComponent } from 'src/core/components/input/input.component';
import { LayoutRoundedButtonFooterComponent } from 'src/core/components/layout-rounded-button-footer/layout-rounded-button-footer.component';
import { TEXTOS } from 'src/core/constants/textos.constants';

export interface FormularioExemploModel {
  nome: FormControl<string>;
  sobrenome: FormControl<string>;
  email: FormControl<string>;
  telefone: FormControl<string>;
  cep: FormControl<string>;
  endereco: FormControl<string>;
  numero: FormControl<string>;
  complemento: FormControl<string>;
  bairro: FormControl<string>;
  cidade: FormControl<string>;
}

/**
 * Formulario compartilhado pelas duas telas: so o tratamento do teclado muda entre elas.
 * Mesmo esqueleto de dados-pessoais do e-commerce (varios campos + botao no rodape).
 */
@Component({
  selector: 'app-formulario-exemplo',
  standalone: true,
  imports: [InputComponent, LayoutRoundedButtonFooterComponent],
  templateUrl: './formulario-exemplo.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioExemploComponent {
  public readonly formulario = input.required<FormGroup<FormularioExemploModel>>();
  public readonly exibirEspacadorTeclado = input<boolean>(true);

  public readonly botaoClicado = output<void>();

  protected readonly textos = TEXTOS.formulario;
}
