import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || !connectionSettings.settings.api_key) {
    throw new Error('Resend not connected');
  }
  return {
    apiKey: connectionSettings.settings.api_key,
    fromEmail: connectionSettings.settings.from_email
  };
}

async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

export async function sendAuthEmail(
  toEmail: string,
  authCode: string,
  magicLinkToken: string,
  baseUrl: string,
  isRegistration: boolean = false
) {
  const { client, fromEmail } = await getUncachableResendClient();

  const magicLinkUrl = `${baseUrl}/auth/verify?token=${magicLinkToken}`;
  const actionText = isRegistration ? 'Complete Registration' : 'Sign In';
  const headerText = isRegistration ? 'Welcome to KASINA' : 'Sign In to KASINA';
  const descriptionText = isRegistration
    ? 'Complete your registration by clicking the link below or entering the 6-digit code.'
    : 'Sign in to your account by clicking the link below or entering the 6-digit code.';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0f0f0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #0A0052 0%, #2a1570 100%); border-radius: 16px; padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 8px 0; font-weight: 700;">KASINA</h1>
          <p style="color: #a78bfa; font-size: 14px; margin: 0 0 30px 0; letter-spacing: 1px;">MEDITATION</p>
          
          <h2 style="color: #ffffff; font-size: 20px; margin: 0 0 12px 0;">${headerText}</h2>
          <p style="color: #c4b5fd; font-size: 14px; margin: 0 0 30px 0; line-height: 1.5;">${descriptionText}</p>
          
          <div style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="color: #c4b5fd; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Your 6-digit code</p>
            <p style="color: #ffffff; font-size: 36px; font-weight: 700; margin: 0; letter-spacing: 8px; font-family: monospace;">${authCode}</p>
          </div>
          
          <p style="color: #c4b5fd; font-size: 13px; margin: 0 0 16px 0;">Or click the button below:</p>
          
          <a href="${magicLinkUrl}" style="display: inline-block; background: #6d28d9; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">${actionText}</a>
          
          <p style="color: #7c3aed; font-size: 12px; margin: 24px 0 0 0;">This code expires in 10 minutes.</p>
        </div>
        
        <p style="color: #666; font-size: 11px; text-align: center; margin-top: 20px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    </body>
    </html>
  `;

  const { data, error } = await client.emails.send({
    from: fromEmail || 'KASINA <noreply@kasina.app>',
    to: [toEmail],
    subject: `${authCode} - Your KASINA ${isRegistration ? 'Registration' : 'Login'} Code`,
    html: htmlContent,
  });

  if (error) {
    console.error('Failed to send auth email:', error);
    throw new Error('Failed to send authentication email');
  }

  console.log(`📧 Auth email sent to ${toEmail}, message ID: ${data?.id}`);
  return data;
}
