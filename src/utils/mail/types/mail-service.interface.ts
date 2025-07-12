export interface IMailService {
  sendEmail(msg: SendEmailInputType): void;
}
export type SendEmailInputType = {
  recipientAddress: string;
  recipientName: string;
  subject: string;
  html: string;
  text?: string;
};
