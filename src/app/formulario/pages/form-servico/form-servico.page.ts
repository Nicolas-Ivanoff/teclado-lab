import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { FormularioExemploComponent } from 'src/app/formulario/components/formulario-exemplo/formulario-exemplo.component';
import { criarFormularioExemplo } from 'src/app/formulario/helpers/criar-formulario-exemplo';
import { TEXTOS } from 'src/core/constants/textos.constants';

/**
 * Tratamento de teclado pelo KeyboardScrollService (iniciado no AppComponent):
 * KeyboardResize.None + spacer --keyboard-safe-area + scroll manual. scrollAssist do Ionic desligado.
 */
@Component({
  selector: 'app-form-servico',
  standalone: true,
  imports: [
    IonBackButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    FormularioExemploComponent,
  ],
  templateUrl: './form-servico.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormServicoPage {
  protected readonly textos = TEXTOS.formulario;
  protected readonly formulario = criarFormularioExemplo();

  protected onBotaoClicado(): void {
    this.formulario.markAllAsTouched();
  }
}
