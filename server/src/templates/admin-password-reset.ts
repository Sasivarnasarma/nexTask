import fs from 'fs';
import path from 'path';

export interface PasswordResetTemplateData {
  email: string;
  name: string;
  clientUrl: string;
}

export function getAdminPasswordResetTemplate(data: PasswordResetTemplateData): string {
  const filePath = path.join(__dirname, 'admin-password-reset.html');
  let html = fs.readFileSync(filePath, 'utf-8');

  html = html
    .replace(/\{\{email\}\}/g, data.email)
    .replace(/\{\{name\}\}/g, data.name)
    .replace(/\{\{clientUrl\}\}/g, data.clientUrl);

  return html;
}
