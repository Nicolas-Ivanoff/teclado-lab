import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { IonButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-layout-rounded-button-footer',
  standalone: true,
  imports: [IonButton],
  templateUrl: './layout-rounded-button-footer.component.html',
  styleUrl: './layout-rounded-button-footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.layout-rounded-button-footer--sem-espacador-teclado]':
      '!exibirEspacadorTeclado()',
  },
})
export class LayoutRoundedButtonFooterComponent {
  public readonly textoBotao = input<string>('');
  public readonly desabilitarBotao = input<boolean>(false);
  public readonly exibirEspacadorTeclado = input<boolean>(true);

  public readonly botaoClicado = output<void>();
}
