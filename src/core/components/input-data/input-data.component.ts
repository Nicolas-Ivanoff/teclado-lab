import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  IonIcon,
  IonInput,
  IonItem,
  ModalController,
} from '@ionic/angular/standalone';
import { MaskitoDirective } from '@maskito/angular';
import { MaskitoElementPredicate, MaskitoOptions } from '@maskito/core';
import { addIcons } from 'ionicons';
import { calendarOutline } from 'ionicons/icons';
import {
  DatepickerComponent,
  ROLE_DATEPICKER_CONFIRMAR,
} from 'src/core/components/datepicker/datepicker.component';
import {
  dataBrParaIso,
  dataIsoParaBr,
  MASCARA_DATA,
} from 'src/core/helpers/data.helper';

/**
 * Campo de data no mesmo formato do ft-input-data do e-commerce: ion-input type="tel" com mascara
 * dd/mm/aaaa (Maskito) e icone de calendario que abre o datepicker em modal.
 */
@Component({
  selector: 'app-input-data',
  standalone: true,
  imports: [IonIcon, IonInput, IonItem, MaskitoDirective, ReactiveFormsModule],
  templateUrl: './input-data.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputDataComponent {
  public readonly controle = input.required<FormControl<string>>();
  public readonly rotulo = input.required<string>();
  public readonly textoErro = input<string>('');

  private readonly _modalController = inject(ModalController);

  protected readonly mascara: MaskitoOptions = { mask: MASCARA_DATA };
  protected readonly elementoInput: MaskitoElementPredicate = async (
    elemento,
  ) => (elemento as HTMLIonInputElement).getInputElement();

  constructor() {
    addIcons({ calendarOutline });
  }

  protected async abrirDatepicker(evento: Event): Promise<void> {
    evento.stopPropagation();
    evento.preventDefault();

    const controle = this.controle();
    controle.markAsTouched();

    const modal = await this._modalController.create({
      component: DatepickerComponent,
      componentProps: { dataInicial: dataBrParaIso(controle.value) },
      breakpoints: [0, 0.8],
      initialBreakpoint: 0.8,
    });
    await modal.present();

    const { data, role } = await modal.onWillDismiss<string>();
    if (role === ROLE_DATEPICKER_CONFIRMAR && data) {
      controle.setValue(dataIsoParaBr(data));
    }
  }
}
