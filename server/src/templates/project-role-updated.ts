import fs from 'fs';
import path from 'path';

export interface ProjectRoleUpdatedTemplateData {
  name: string;
  projectName: string;
  newRole: string;
  clientUrl: string;
}

export function getProjectRoleUpdatedTemplate(data: ProjectRoleUpdatedTemplateData): string {
  const filePath = path.join(__dirname, 'project-role-updated.html');
  let html = fs.readFileSync(filePath, 'utf-8');

  html = html
    .replace(/\{\{name\}\}/g, data.name)
    .replace(/\{\{projectName\}\}/g, data.projectName)
    .replace(/\{\{newRole\}\}/g, data.newRole)
    .replace(/\{\{clientUrl\}\}/g, data.clientUrl);

  return html;
}
