import fs from 'fs';
import path from 'path';

export interface ForgotPasswordTemplateData {
  email: string;
  name: string;
  resetLink: string;
}

export function getForgotPasswordTemplate(data: ForgotPasswordTemplateData): string {
  const filePath = path.join(__dirname, 'forgot-password.html');
  let html = fs.readFileSync(filePath, 'utf-8');

  html = html
    .replace(/\{\{email\}\}/g, data.email)
    .replace(/\{\{name\}\}/g, data.name)
    .replace(/\{\{resetLink\}\}/g, data.resetLink);

  return html;
}
