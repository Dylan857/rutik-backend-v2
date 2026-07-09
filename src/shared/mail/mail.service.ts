import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('mail.apiKey'));
    this.from = this.configService.get<string>('mail.from', '');
  }

  async sendPasswordResetCode(to: string, code: string): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject: 'Código para restablecer tu contraseña',
      html: `
        <p>Usa el siguiente código para restablecer tu contraseña en Rutik:</p>
        <h2 style="letter-spacing: 4px;">${code}</h2>
        <p>Este código vence en 10 minutos. Si no solicitaste este cambio, ignora este correo.</p>
      `,
    });

    if (error) {
      throw new Error(`Failed to send password reset email: ${error.message}`);
    }
  }
}
