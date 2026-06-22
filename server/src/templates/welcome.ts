import fs from 'fs';
import path from 'path';

export interface WelcomeTemplateData {
  email: string;
  name: string;
  tempPassword: string;
  clientUrl: string;
}

export function getWelcomeTemplate(data: WelcomeTemplateData): string {
  const filePath = path.join(__dirname, 'welcome.html');
  let html = fs.readFileSync(filePath, 'utf-8');

  html = html
    .replace(/\{\{email\}\}/g, data.email)
    .replace(/\{\{name\}\}/g, data.name)
    .replace(/\{\{tempPassword\}\}/g, data.tempPassword)
    .replace(/\{\{clientUrl\}\}/g, data.clientUrl);

  return html;
}
