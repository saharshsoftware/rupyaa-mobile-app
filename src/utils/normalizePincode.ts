export const normalizePincode = (text: string): string =>
  text.replace(/[^0-9]/g, '').slice(0, 6);
