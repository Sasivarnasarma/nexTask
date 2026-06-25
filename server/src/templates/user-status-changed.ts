import fs from 'fs';
import path from 'path';

export interface UserStatusTemplateData {
  email: string;
  name: string;
  actionTitle: string;
  statusMessage: string;
  statusLabel: string;
  statusDescription: string;
  statusTextColor: string;
  statusBgColor: string;
  statusBorderColor: string;
}

export function getUserStatusChangedTemplate(data: UserStatusTemplateData): string {
  const filePath = path.join(__dirname, 'user-status-changed.html');
  let html = fs.readFileSync(filePath, 'utf-8');

  html = html
    .replace(/\{\{email\}\}/g, data.email)
    .replace(/\{\{name\}\}/g, data.name)
    .replace(/\{\{actionTitle\}\}/g, data.actionTitle)
    .replace(/\{\{statusMessage\}\}/g, data.statusMessage)
    .replace(/\{\{statusLabel\}\}/g, data.statusLabel)
    .replace(/\{\{statusDescription\}\}/g, data.statusDescription)
    .replace(/__TEXT_COLOR__/g, data.statusTextColor)
    .replace(/__BG_COLOR__/g, data.statusBgColor)
    .replace(/__BORDER_COLOR__/g, data.statusBorderColor);

  return html;
}
