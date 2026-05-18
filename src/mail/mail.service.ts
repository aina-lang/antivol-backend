import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT', 587),
      secure: false, // true for 465, false for other ports (like 587)
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });
  }

  async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      const info = await this.transporter.sendMail({
        from: `"Antivol App" <${this.configService.get<string>('MAIL_USER')}>`,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent successfully to ${to}: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
      return false;
    }
  }

  async sendOtpEmail(to: string, code: string, purpose: string): Promise<boolean> {
    const isRegister = purpose === 'EMAIL_VERIFICATION';
    const subject = isRegister ? 'Validation de votre adresse email' : 'Réinitialisation de votre mot de passe';
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
        <div style="text-align: center; border-bottom: 2px solid #00D4FF; padding-bottom: 20px; margin-bottom: 20px;">
          <h2 style="color: #333333; margin: 0;">Sécurité Antivol</h2>
        </div>
        <p style="font-size: 16px; color: #555555; line-height: 1.5;">Bonjour,</p>
        <p style="font-size: 16px; color: #555555; line-height: 1.5;">
          ${isRegister 
            ? "Merci de vous être inscrit sur Antivol App. Veuillez valider votre adresse email en utilisant le code OTP ci-dessous :" 
            : "Une demande de réinitialisation de mot de passe a été initiée. Veuillez utiliser le code OTP ci-dessous pour changer votre mot de passe :"}
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #00D4FF; padding: 10px 20px; background-color: #f0fafd; border-radius: 5px; border: 1px dashed #00D4FF;">
            ${code}
          </span>
        </div>
        <p style="font-size: 14px; color: #888888; line-height: 1.5;">Ce code est valable pendant 10 minutes. Ne le partagez jamais.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #aaaaaa; text-align: center; margin: 0;">Ceci est un email automatisé, merci de ne pas y répondre.</p>
      </div>
    `;

    return this.sendMail(to, subject, htmlContent);
  }
}
