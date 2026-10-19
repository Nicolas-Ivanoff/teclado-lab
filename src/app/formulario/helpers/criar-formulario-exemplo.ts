import { FormControl, FormGroup, Validators } from '@angular/forms';
import { FormularioExemploModel } from 'src/app/formulario/components/formulario-exemplo/formulario-exemplo.component';
import { validarDataBr } from 'src/core/helpers/data.helper';

const criarControleObrigatorio = (): FormControl<string> =>
  new FormControl('', { nonNullable: true, validators: [Validators.required] });

export const criarFormularioExemplo = (): FormGroup<FormularioExemploModel> =>
  new FormGroup<FormularioExemploModel>({
    nome: criarControleObrigatorio(),
    sobrenome: criarControleObrigatorio(),
    dataNascimento: new FormControl('', {
      nonNullable: true,
      validators: [validarDataBr],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    telefone: criarControleObrigatorio(),
    cep: criarControleObrigatorio(),
    endereco: criarControleObrigatorio(),
    numero: criarControleObrigatorio(),
    complemento: new FormControl('', { nonNullable: true }),
    bairro: criarControleObrigatorio(),
    cidade: criarControleObrigatorio(),
  });
