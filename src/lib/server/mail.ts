type PasswordSetupEmailVariant = 'welcome' | 'reset';

/**
 * Interface for standard welcome email inputs
 */
interface WelcomeEmailOptions {
  email: string;
  name: string;
  setupLink: string;
  variant?: PasswordSetupEmailVariant;
}

type WelcomeEmailResult = {
  success: boolean;
  error?: string;
  diagnostics?: {
    fromEmail?: string;
    hasApiKey?: boolean;
    provider?: 'resend';
    status?: number;
    statusText?: string;
  };
};

type MeetingEmailOptions = {
  email: string;
  name: string;
  subject: string;
  title: string;
  dateLabel: string;
  timeLabel: string;
  location: string;
  body: string;
  actionLabel: string;
};

type MeetingEmailResult = WelcomeEmailResult;

/**
 * Sends a branded password-setup email to new users or for admin resets.
 * Uses the Resend API via fetch to avoid dependency bloating.
 */
export async function sendWelcomeEmail({ email, name, setupLink, variant = 'welcome' }: WelcomeEmailOptions): Promise<WelcomeEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.MAIL_FROM ||
    process.env.RESEND_FROM ||
    process.env.EMAIL_FROM ||
    'onboarding@resend.dev';

  if (!apiKey) {
    console.warn(`[MAIL] Skipping dispatch to ${email}. RESEND_API_KEY is not configured.`);
    console.info(`[MAIL] Manual link for ${name}: ${setupLink}`);
    return {
      success: true,
      error: 'RESEND_API_KEY missing',
      diagnostics: { fromEmail, hasApiKey: false, provider: 'resend' },
    };
  }

  if (!fromEmail) {
    console.warn(`[MAIL] Skipping dispatch to ${email}. MAIL_FROM is not configured.`);
    console.info(`[MAIL] Manual link for ${name}: ${setupLink}`);
    return {
      success: true,
      error: 'Sender email missing (set MAIL_FROM or RESEND_FROM)',
      diagnostics: { hasApiKey: true, provider: 'resend' },
    };
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Safeviate</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #1e293b;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          }
          .header {
            background-color: #0f172a;
            color: #ffffff;
            padding: 40px 20px;
            text-align: center;
          }
          .content {
            padding: 40px 30px;
          }
          .footer {
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
          }
          .button {
            display: inline-block;
            padding: 14px 28px;
            background-color: #2563eb;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 700;
            margin-top: 24px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-size: 14px;
          }
          .badge {
            display: inline-block;
            padding: 4px 10px;
            background-color: #f1f5f9;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            color: #475569;
            margin-bottom: 8px;
          }
          h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; }
          p { margin-top: 0; margin-bottom: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="badge">Aviation Management</div>
            <h1>SAFEVIATE</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${name}</strong>,</p>
            <p>${
              variant === 'reset'
                ? 'An administrator has requested a password reset for your Safeviate account.'
                : 'Your account has been successfully established in the Safeviate Aviation Management system.'
            }</p>
            <p>To continue, please click the secure link below and choose your password.</p>
            <center>
              <a href="${setupLink}" class="button">${variant === 'reset' ? 'Reset Password' : 'Set Your Password'}</a>
            </center>
            <p style="margin-top: 32px; font-size: 13px; color: #64748b;">
              If you did not expect this message, please disregard this email.
            </p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Safeviate. Advanced Agentic Aviation Tools.
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `Safeviate <${fromEmail}>`,
        to: [email],
        subject: variant === 'reset' ? 'Safeviate Password Reset' : 'Welcome to Safeviate - Account Ready',
        html,
      }),
    });

    if (!response.ok) {
      const responseText = await response.text();
      let errorMessage = responseText;

      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || responseText;
      } catch {
        // Keep raw response text when Resend does not return JSON.
      }

      return {
        success: false,
        error: `Resend rejected the message (${response.status} ${response.statusText}): ${errorMessage}`,
        diagnostics: {
          fromEmail,
          hasApiKey: true,
          provider: 'resend',
          status: response.status,
          statusText: response.statusText,
        },
      };
    }

    return {
      success: true,
      diagnostics: { fromEmail, hasApiKey: true, provider: 'resend', status: response.status, statusText: response.statusText },
    };
  } catch (error) {
    console.error(`[MAIL] Error sending welcome email to ${email}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send welcome email.',
      diagnostics: { fromEmail, hasApiKey: true, provider: 'resend' },
    };
  }
}

export async function sendMeetingEmail({
  email,
  name,
  subject,
  title,
  dateLabel,
  timeLabel,
  location,
  body,
  actionLabel,
}: MeetingEmailOptions): Promise<MeetingEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.MAIL_FROM ||
    process.env.RESEND_FROM ||
    process.env.EMAIL_FROM ||
    'meetings@resend.dev';

  if (!apiKey) {
    console.warn(`[MAIL] Skipping meeting email to ${email}. RESEND_API_KEY is not configured.`);
    return {
      success: true,
      error: 'RESEND_API_KEY missing',
      diagnostics: { fromEmail, hasApiKey: false, provider: 'resend' },
    };
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc; }
          .container { max-width: 640px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); }
          .header { background-color: #0f172a; color: #ffffff; padding: 32px 24px; }
          .content { padding: 32px 24px; }
          .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 24px 0; }
          .meta div { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #f8fafc; }
          .label { display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #64748b; margin-bottom: 4px; }
          .value { font-size: 14px; font-weight: 600; color: #0f172a; }
          .body { white-space: pre-wrap; margin-top: 8px; }
          .button { display: inline-block; padding: 12px 20px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 700; margin-top: 16px; text-transform: uppercase; letter-spacing: 0.05em; font-size: 13px; }
          .footer { padding: 18px 24px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.14em; opacity: 0.8; font-weight: 800;">Safeviate Meetings</div>
            <h1 style="margin: 8px 0 0; font-size: 22px; font-weight: 800; letter-spacing: -0.025em;">${title}</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${name}</strong>,</p>
            <p>${body}</p>
            <div class="meta">
              <div><span class="label">Date</span><span class="value">${dateLabel}</span></div>
              <div><span class="label">Time</span><span class="value">${timeLabel}</span></div>
              <div><span class="label">Location</span><span class="value">${location}</span></div>
              <div><span class="label">Meeting</span><span class="value">${title}</span></div>
            </div>
            <a class="button" href="mailto:${email}">${actionLabel}</a>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Safeviate. Advanced Agentic Aviation Tools.
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `Safeviate Meetings <${fromEmail}>`,
        to: [email],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const responseText = await response.text();
      return {
        success: false,
        error: `Resend rejected the message (${response.status} ${response.statusText}): ${responseText}`,
        diagnostics: {
          fromEmail,
          hasApiKey: true,
          provider: 'resend',
          status: response.status,
          statusText: response.statusText,
        },
      };
    }

    return {
      success: true,
      diagnostics: { fromEmail, hasApiKey: true, provider: 'resend', status: response.status, statusText: response.statusText },
    };
  } catch (error) {
    console.error(`[MAIL] Error sending meeting email to ${email}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send meeting email.',
      diagnostics: { fromEmail, hasApiKey: true, provider: 'resend' },
    };
  }
}
