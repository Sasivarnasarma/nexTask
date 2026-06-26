import fs from 'fs';
import path from 'path';

export interface UserRemovedTemplateData {
  email: string;
  name: string;
}

export function getUserRemovedTemplate(data: UserRemovedTemplateData): string {
  const filePath = path.join(__dirname, 'user-removed.html');
  let html = fs.readFileSync(filePath, 'utf-8');

  html = html.replace(/\{\{email\}\}/g, data.email).replace(/\{\{name\}\}/g, data.name);

  return html;
}
