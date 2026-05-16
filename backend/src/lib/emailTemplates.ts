function emailWrapper(brandName: string, bodyContent: string, footerText: string): string {
  return `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h2 style="color: #4f46e5; margin: 0;">${brandName}</h2>
  </div>
  ${bodyContent}
  <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin-top: 24px;">
    ${footerText}
  </p>
</div>
  `.trim();
}

export function otpEmailTemplate(otp: string, expiryMinutes: number): string {
  const body = `
    <p style="color: #374151; font-size: 15px; line-height: 1.6;">
      Your one-time verification code is:
    </p>
    <div style="text-align: center; margin: 24px 0;">
      <span style="display: inline-block; padding: 16px 32px; background-color: #4f46e5; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; border-radius: 12px; font-size: 32px; font-weight: 700; letter-spacing: 8px;">
        ${otp}
      </span>
    </div>
  `;
  return emailWrapper(
    "Ankan's Bank",
    body,
    `This code expires in <strong>${expiryMinutes} minutes</strong>. If you didn't request this, you can safely ignore this email.`,
  );
}

export function budgetAlertEmailTemplate(category: string, spent: number, threshold: number): string {
  const body = `
    <div style="text-align: center; margin: 16px 0 24px;">
      <span style="display: inline-block; padding: 8px 20px; background-color: #f97316; background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; border-radius: 8px; font-size: 14px; font-weight: 700;">
        Budget Alert
      </span>
    </div>
    <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
      You've reached your spending limit for a category. Here's a summary:
    </p>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr>
        <td style="padding: 10px 12px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Category</td>
        <td style="padding: 10px 12px; color: #111827; font-weight: 600; border-bottom: 1px solid #f3f4f6; text-align: right;">${category}</td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Spent this month</td>
        <td style="padding: 10px 12px; color: #ef4444; font-weight: 700; border-bottom: 1px solid #f3f4f6; text-align: right;">$${spent.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; color: #6b7280;">Your threshold</td>
        <td style="padding: 10px 12px; color: #374151; font-weight: 600; text-align: right;">$${threshold.toFixed(2)}</td>
      </tr>
    </table>
    <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-top: 20px;">
      Consider reviewing your spending in this category.
    </p>
  `;
  return emailWrapper(
    "Ankan's Bank",
    body,
    "You're receiving this because you set up a budget alert on Ankan's Bank.",
  );
}

export function largeTransactionEmailTemplate(
  name: string,
  amount: number,
  date: string | Date,
  threshold: number,
): string {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const body = `
    <div style="text-align: center; margin: 16px 0 24px;">
      <span style="display: inline-block; padding: 8px 20px; background-color: #ef4444; background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; border-radius: 8px; font-size: 14px; font-weight: 700;">
        Large Transaction Detected
      </span>
    </div>
    <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
      A transaction exceeding your alert threshold was detected:
    </p>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr>
        <td style="padding: 10px 12px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Merchant</td>
        <td style="padding: 10px 12px; color: #111827; font-weight: 600; border-bottom: 1px solid #f3f4f6; text-align: right;">${name}</td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Amount</td>
        <td style="padding: 10px 12px; color: #ef4444; font-weight: 700; border-bottom: 1px solid #f3f4f6; text-align: right;">$${amount.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">Date</td>
        <td style="padding: 10px 12px; color: #374151; border-bottom: 1px solid #f3f4f6; text-align: right;">${formattedDate}</td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; color: #6b7280;">Your threshold</td>
        <td style="padding: 10px 12px; color: #374151; font-weight: 600; text-align: right;">$${threshold.toFixed(2)}</td>
      </tr>
    </table>
    <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-top: 20px;">
      This transaction exceeds your configured alert threshold.
    </p>
  `;
  return emailWrapper(
    "Ankan's Bank",
    body,
    "You're receiving this because you set up a transaction alert on Ankan's Bank.",
  );
}
