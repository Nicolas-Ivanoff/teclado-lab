import {
  ChangeDetectionStrategy,
  Component,
  input,
  viewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { IonInput, IonItem } from '@ionic/angular/standalone';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [ReactiveFormsModule, IonInput, IonItem],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputComponent {
  public readonly controle = input.required<FormControl<string>>();
  public readonly rotulo = input.required<string>();
  public readonly textoErro = input<string>('');
  public readonly tipo = input<'text' | 'email' | 'tel'>('text');
  public readonly modoTeclado = input<'text' | 'email' | 'tel' | 'numeric'>(
    'text',
  );

  public readonly campo = viewChild<IonInput>('campo');

  public focus(): void {
    this.campo()?.setFocus().then();
  }
}
