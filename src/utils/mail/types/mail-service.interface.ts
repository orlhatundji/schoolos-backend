export interface IMailService {
  sendEmail(msg: SendEmailInputType): void;
}

export interface EmailAttachment {
  filename: string;
  /** Base64-encoded content (survives BullMQ JSON serialization). */
  contentBase64: string;
  contentType: string;
}

export type SendEmailInputType = {
  recipientAddress: string;
  recipientName: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
};
