export interface IEncryptor {
  encrypt(text: string): string;
  decrypt(encryptedText: string): string;
}
