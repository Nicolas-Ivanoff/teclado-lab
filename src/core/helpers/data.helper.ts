import { AbstractControl, ValidationErrors } from '@angular/forms';

const REGEX_DATA_BR = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export const MASCARA_DATA: (string | RegExp)[] = [
  /\d/,
  /\d/,
  '/',
  /\d/,
  /\d/,
  '/',
  /\d/,
  /\d/,
  /\d/,
  /\d/,
];

/** Converte "dd/mm/aaaa" em "aaaa-mm-dd" (ou string vazia se o formato for invalido). */
export const dataBrParaIso = (dataBr: string): string => {
  const partes = REGEX_DATA_BR.exec(dataBr);
  return partes ? `${partes[3]}-${partes[2]}-${partes[1]}` : '';
};

/** Converte "aaaa-mm-dd[...]" em "dd/mm/aaaa". */
export const dataIsoParaBr = (dataIso: string): string => {
  const [ano, mes, dia] = dataIso.slice(0, 10).split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : '';
};

export const validarDataBr = (
  controle: AbstractControl<string>,
): ValidationErrors | null => {
  const partes = REGEX_DATA_BR.exec(controle.value);
  if (!partes) {
    return { dataInvalida: true };
  }

  const dia = Number(partes[1]);
  const mes = Number(partes[2]);
  const ano = Number(partes[3]);
  const data = new Date(ano, mes - 1, dia);
  const dataExiste =
    data.getFullYear() === ano &&
    data.getMonth() === mes - 1 &&
    data.getDate() === dia;

  return dataExiste && data <= new Date() ? null : { dataInvalida: true };
};
