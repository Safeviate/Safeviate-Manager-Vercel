/**
 * Interface for standard welcome email inputs
 */
interface WelcomeEmailOptions {
  email: string;
  name: string;
  setupLink: string;
  tempPassword?: string;
}

/**
 * Sends a branded welcome email to new users.
 * Uses the Resend API via fetch to avoid dependency bloating.
 */
export async function sendWelcomeEmail({ email, name, setupLink, tempPassword }: WelcomeEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.MAIL_FROM;

  if (!apiKey) {
    console.warn(`[MAIL] Skipping dispatch to ${email}. RESEND_API_KEY is not configured.`);
    console.info(`[MAIL] Manual link for ${name}: ${setupLink}`);
    return { success: false, error: 'API Key missing' };
  }

  if (!fromEmail) {
    console.warn(`[MAIL] Skipping dispatch to ${email}. MAIL_FROM is not configured.`);
    console.info(`[MAIL] Manual link for ${name}: ${setupLink}`);
    return { success: false, error: 'MAIL_FROM missing' };
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
            <p>Your account has been successfully established in the Safeviate Aviation Management system.</p>
            <p>To finalize your setup and gain access to your flight operations dashboard, please click the secure link below and sign in with the temporary password shown here.</p>
            ${tempPassword ? `<p><strong>Temporary password:</strong> <code>${tempPassword}</code></p>` : ''}
            <center>
              <a href="${setupLink}" class="button">Open Safeviate</a>
            </center>
            <p style="margin-top: 32px; font-size: 13px; color: #64748b;">
              If you did not expect this invitation, please disregard this email.
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
      subject: 'Welcome to Safeviate - Account Ready',
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

      throw new Error(
        `Resend rejected the message (${response.status} ${response.statusText}): ${errorMessage}`
      );
    }

    return { success: true };
  } catch (error: any) {
    console.error(`[MAIL] Error sending welcome email to ${email}:`, error);
    return { success: false, error: error.message };
  }
}
