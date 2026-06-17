import { isValidCPF, isValidCNPJ, classifyDocument, onlyDigits } from '../document';

describe('document validation', () => {
  it('strips non-digits', () => {
    expect(onlyDigits('123.456.789-09')).toBe('12345678909');
  });

  it('validates a correct CPF', () => {
    expect(isValidCPF('529.982.247-25')).toBe(true);
  });

  it('rejects an incorrect CPF and repeated digits', () => {
    expect(isValidCPF('111.111.111-11')).toBe(false);
    expect(isValidCPF('529.982.247-20')).toBe(false);
    expect(isValidCPF('123')).toBe(false);
  });

  it('validates a correct CNPJ', () => {
    expect(isValidCNPJ('11.222.333/0001-81')).toBe(true);
  });

  it('rejects an incorrect CNPJ and repeated digits', () => {
    expect(isValidCNPJ('11.111.111/1111-11')).toBe(false);
    expect(isValidCNPJ('11.222.333/0001-80')).toBe(false);
  });

  it('classifies document type or returns null when invalid', () => {
    expect(classifyDocument('529.982.247-25')).toBe('cpf');
    expect(classifyDocument('11.222.333/0001-81')).toBe('cnpj');
    expect(classifyDocument('999')).toBeNull();
  });
});
