import nodemailer from 'nodemailer';

import { config } from '../config.js';
import { info, error as logError } from '../lib/logger.js';

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

export function createEmailService({
    smtp = config.smtp,
    appBaseUrl = config.appBaseUrl,
    production = config.isProduction
} = {}) {
    const configured = Boolean(smtp.host && smtp.from);

    const ttlHours = Math.max(
        1,
        Math.round(config.verificationTokenTtlMs / (60 * 60 * 1000))
    );

    const transporter = configured
        ? nodemailer.createTransport({
              host: smtp.host,
              port: smtp.port,
              secure: smtp.secure,
              auth: smtp.user
                  ? {
                        user: smtp.user,
                        pass: smtp.pass
                    }
                  : undefined
          })
        : null;

    async function sendVerificationEmail({ to, token }) {
        const verifyUrl =
            `${appBaseUrl}/api/auth/verify-email?token=` +
            encodeURIComponent(token);

        if (!transporter) {
            if (production) {
                throw new Error('EMAIL_NOT_CONFIGURED');
            }

            // En desarrollo no hay proveedor SMTP: el enlace se muestra en
            // la consola del servidor para poder probar el flujo completo.
            info(
                'SMTP no configurado. Enlace de verificación para',
                to,
                ':',
                verifyUrl
            );

            return { delivered: false, previewUrl: verifyUrl };
        }

        const safeUrl = escapeHtml(verifyUrl);

        try {
            await transporter.sendMail({
                from: smtp.from,
                to,
                subject: 'Confirma tu cuenta',
                text:
                    `Confirma tu cuenta abriendo este enlace:\n\n${verifyUrl}\n\n` +
                    `El enlace caduca en ${ttlHours} horas. Si no has creado esta cuenta, ` +
                    'puedes ignorar este mensaje.',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
                        <h2>Confirma tu cuenta</h2>
                        <p>Gracias por registrarte. Pulsa el botón para activar tu cuenta:</p>
                        <p style="margin: 28px 0;">
                            <a href="${safeUrl}"
                               style="background:#4f46e5;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">
                                Confirmar cuenta
                            </a>
                        </p>
                        <p>Si el botón no funciona, copia este enlace en el navegador:</p>
                        <p style="word-break: break-all; color:#475569;">${safeUrl}</p>
                        <p style="color:#64748b;font-size:13px;">
                            El enlace caduca en ${ttlHours} horas. Si no has creado esta cuenta,
                            puedes ignorar este mensaje.
                        </p>
                    </div>
                `
            });

            info('Correo de verificación enviado a', to);
            return { delivered: true };
        } catch (e) {
            logError('No se pudo enviar el correo de verificación a', to, e);
            throw new Error('EMAIL_SEND_FAILED');
        }
    }

    return {
        configured,
        sendVerificationEmail
    };
}
