import fs from 'fs';
import path from 'path';

export interface ProjectAddedTemplateData {
  name: string;
  projectName: string;
  clientUrl: string;
}

export function getProjectAddedTemplate(data: ProjectAddedTemplateData): string {
  const filePath = path.join(__dirname, 'project-added.html');
  let html = fs.readFileSync(filePath, 'utf-8');

  html = html
    .replace(/\{\{name\}\}/g, data.name)
    .replace(/\{\{projectName\}\}/g, data.projectName)
    .replace(/\{\{clientUrl\}\}/g, data.clientUrl);

  return html;
}
