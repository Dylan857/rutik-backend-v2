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

  async sendGuardianWelcome(
    to: string,
    firstName: string,
    activationUrl: string,
  ): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject: 'Bienvenido a Rutik — activa tu cuenta',
      html: `
        <div style="background-color: #f9fafb; padding: 32px 16px; font-family: 'Helvetica Neue', Arial, sans-serif;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
            <div style="background-color: #16a34a; padding: 24px 32px; text-align: center;">
              <span style="color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">RUTIK</span>
            </div>
            <div style="padding: 32px;">
              <h1 style="margin: 0 0 8px; font-size: 20px; color: #111827;">¡Bienvenido, ${firstName}! 👋</h1>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #4b5563;">
                Ya puedes acceder al portal de pagos de Rutik para hacer seguimiento del transporte
                escolar de tu hijo o hija. Para comenzar, crea tu contraseña haciendo clic en el
                siguiente botón:
              </p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${activationUrl}"
                   style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none;
                          font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 10px;">
                  Crear mi contraseña
                </a>
              </div>
              <p style="margin: 0 0 4px; font-size: 12px; color: #9ca3af;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:
              </p>
              <p style="margin: 0 0 20px; font-size: 12px; color: #16a34a; word-break: break-all;">
                ${activationUrl}
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                Este enlace vence en 7 días. Si no esperabas este correo, puedes ignorarlo.
              </p>
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      throw new Error(`Failed to send guardian welcome email: ${error.message}`);
    }
  }
}
