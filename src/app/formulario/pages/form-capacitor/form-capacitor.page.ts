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
 * Tratamento de teclado pelo Capacitor/Ionic: KeyboardResize.Native (definido no AppComponent)
 * e scrollAssist/scrollPadding do Ionic ligados (main.ts). O KeyboardScrollService nao e iniciado.
 */
@Component({
  selector: 'app-form-capacitor',
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
  templateUrl: './form-capacitor.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormCapacitorPage {
  protected readonly textos = TEXTOS.formulario;
  protected readonly formulario = criarFormularioExemplo();

  protected onBotaoClicado(): void {
    this.formulario.markAllAsTouched();
  }
}
