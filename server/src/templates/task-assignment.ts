import fs from 'fs';
import path from 'path';

export interface TaskAssignmentTemplateData {
  name: string;
  taskTitle: string;
  projectName: string;
  clientUrl: string;
}

export function getTaskAssignmentTemplate(data: TaskAssignmentTemplateData): string {
  const filePath = path.join(__dirname, 'task-assignment.html');
  let html = fs.readFileSync(filePath, 'utf-8');

  html = html
    .replace(/\{\{name\}\}/g, data.name)
    .replace(/\{\{taskTitle\}\}/g, data.taskTitle)
    .replace(/\{\{projectName\}\}/g, data.projectName)
    .replace(/\{\{clientUrl\}\}/g, data.clientUrl);

  return html;
}
