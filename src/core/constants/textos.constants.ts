import { ModoTecladoEnum } from './modo-teclado.constants';

export const TEXTOS = {
  home: {
    titulo: 'Teclado Lab',
    descricao:
      'Cinco formulários iguais, mudando só a forma de tratar o teclado. Cada botão recarrega o app no modo escolhido.',
    plataforma: 'Plataforma',
    modoAtivo: 'Modo ativo',
    botaoPorModo: {
      [ModoTecladoEnum.SERVICO]: 'Nosso serviço (None + spacer + scroll)',
      [ModoTecladoEnum.NONE]: 'Capacitor: KeyboardResize.None',
      [ModoTecladoEnum.BODY]: 'Capacitor: KeyboardResize.Body',
      [ModoTecladoEnum.IONIC]: 'Capacitor: KeyboardResize.Ionic',
      [ModoTecladoEnum.NATIVE]: 'Capacitor: KeyboardResize.Native',
    } satisfies Record<ModoTecladoEnum, string>,
  },
  formulario: {
    tituloPorModo: {
      [ModoTecladoEnum.SERVICO]: 'Nosso serviço',
      [ModoTecladoEnum.NONE]: 'Capacitor None',
      [ModoTecladoEnum.BODY]: 'Capacitor Body',
      [ModoTecladoEnum.IONIC]: 'Capacitor Ionic',
      [ModoTecladoEnum.NATIVE]: 'Capacitor Native',
    } satisfies Record<ModoTecladoEnum, string>,
    botaoContinuar: 'Continuar',
    voltar: 'Voltar',
    campoObrigatorio: 'Campo obrigatório',
    emailInvalido: 'E-mail inválido',
    dataInvalida: 'Data inválida',
    campos: {
      nome: 'Nome',
      sobrenome: 'Sobrenome',
      dataNascimento: 'Data de nascimento',
      email: 'E-mail',
      telefone: 'Telefone',
      cep: 'CEP',
      endereco: 'Endereço',
      numero: 'Número',
      complemento: 'Complemento',
      bairro: 'Bairro',
      cidade: 'Cidade',
    },
  },
  datepicker: {
    titulo: 'Selecione a data',
    confirmar: 'Confirmar',
    cancelar: 'Cancelar',
  },
} as const;
