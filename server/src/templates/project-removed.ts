import fs from 'fs';
import path from 'path';

export interface ProjectRemovedTemplateData {
  name: string;
  projectName: string;
  clientUrl: string;
}

export function getProjectRemovedTemplate(data: ProjectRemovedTemplateData): string {
  const filePath = path.join(__dirname, 'project-removed.html');
  let html = fs.readFileSync(filePath, 'utf-8');

  html = html
    .replace(/\{\{name\}\}/g, data.name)
    .replace(/\{\{projectName\}\}/g, data.projectName)
    .replace(/\{\{clientUrl\}\}/g, data.clientUrl);

  return html;
}
