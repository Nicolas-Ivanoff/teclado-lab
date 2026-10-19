import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonDatetime,
  IonHeader,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular/standalone';
import { TEXTOS } from 'src/core/constants/textos.constants';

export const ROLE_DATEPICKER_CONFIRMAR = 'confirmar';

/** Modal com ion-datetime, aberto pelo icone de calendario do app-input-data (igual ao e-commerce). */
@Component({
  selector: 'app-datepicker',
  standalone: true,
  imports: [
    IonButton,
    IonButtons,
    IonContent,
    IonDatetime,
    IonHeader,
    IonTitle,
    IonToolbar,
  ],
  templateUrl: './datepicker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatepickerComponent {
  private readonly _modalController = inject(ModalController);

  /** Data inicial em ISO (aaaa-mm-dd), preenchida via componentProps. */
  public dataInicial = '';

  protected readonly textos = TEXTOS.datepicker;
  protected readonly dataMaxima = new Date().toISOString();
  protected readonly dataSelecionada = signal<string>('');

  protected onDataAlterada(evento: CustomEvent): void {
    const valor = evento.detail.value;
    this.dataSelecionada.set(typeof valor === 'string' ? valor : '');
  }

  protected cancelar(): void {
    this._modalController.dismiss(null, 'cancel');
  }

  protected confirmar(): void {
    this._modalController.dismiss(
      this.dataSelecionada() || this.dataInicial,
      ROLE_DATEPICKER_CONFIRMAR,
    );
  }
}
