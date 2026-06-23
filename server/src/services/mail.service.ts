import nodemailer from 'nodemailer';

import { getProjectAddedTemplate } from '../templates/project-added';
import { getProjectRemovedTemplate } from '../templates/project-removed';
import { getProjectRoleUpdatedTemplate } from '../templates/project-role-updated';
import { getTaskAssignmentTemplate } from '../templates/task-assignment';
import { getWelcomeTemplate } from '../templates/welcome';

export class MailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: process.env.SMTP_SECURE === 'true' || port === 465,
        auth: { user, pass },
      });
    }
  }

  public async sendWelcomeEmail(
    to: string,
    name: string | null,
    tempPassword: string,
  ): Promise<void> {
    const displayName = name || 'Team Member';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    if (!this.transporter) {
      console.log(`[MAIL_WARN] SMTP not configured. Welcome email for ${to} printed below:`);
      console.log(` -> Temp Password: ${tempPassword}`);
      return;
    }

    const htmlContent = getWelcomeTemplate({
      email: to,
      name: displayName,
      tempPassword,
      clientUrl,
    });

    await this.transporter.sendMail({
      from: process.env.MAIL_FROM || '"nexTask" <no-reply@nextask.com>',
      to,
      subject: 'Welcome to nexTask - Set Up Your Account',
      html: htmlContent,
    });
  }

  public async sendTaskAssignmentEmail(
    to: string,
    name: string,
    taskTitle: string,
    projectName: string,
  ): Promise<void> {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    if (!this.transporter) {
      console.log(
        `[MAIL_WARN] SMTP not configured. Task Assignment email for ${to} printed below:`,
      );
      console.log(` -> Assigned to Task: ${taskTitle}`);
      return;
    }

    const htmlContent = getTaskAssignmentTemplate({
      name,
      taskTitle,
      projectName,
      clientUrl,
    });

    await this.transporter.sendMail({
      from: process.env.MAIL_FROM || '"nexTask" <no-reply@nextask.com>',
      to,
      subject: `New Task Assigned: ${taskTitle}`,
      html: htmlContent,
    });
  }

  public async sendProjectAddedEmail(to: string, name: string, projectName: string): Promise<void> {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    if (!this.transporter) {
      console.log(`[MAIL_WARN] SMTP not configured. Project Added email for ${to} printed below:`);
      console.log(` -> Added to Project: ${projectName}`);
      return;
    }

    const htmlContent = getProjectAddedTemplate({
      name,
      projectName,
      clientUrl,
    });

    await this.transporter.sendMail({
      from: process.env.MAIL_FROM || '"nexTask" <no-reply@nextask.com>',
      to,
      subject: `Added to Project: ${projectName}`,
      html: htmlContent,
    });
  }

  public async sendProjectRemovedEmail(
    to: string,
    name: string,
    projectName: string,
  ): Promise<void> {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    if (!this.transporter) {
      console.log(
        `[MAIL_WARN] SMTP not configured. Project Removed email for ${to} printed below:`,
      );
      console.log(` -> Removed from Project: ${projectName}`);
      return;
    }

    const htmlContent = getProjectRemovedTemplate({
      name,
      projectName,
      clientUrl,
    });

    await this.transporter.sendMail({
      from: process.env.MAIL_FROM || '"nexTask" <no-reply@nextask.com>',
      to,
      subject: `Removed from Project: ${projectName}`,
      html: htmlContent,
    });
  }

  public async sendProjectRoleUpdatedEmail(
    to: string,
    name: string,
    projectName: string,
    newRole: string,
  ): Promise<void> {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    if (!this.transporter) {
      console.log(
        `[MAIL_WARN] SMTP not configured. Project Role Updated email for ${to} printed below:`,
      );
      console.log(` -> Project: ${projectName} | New Role: ${newRole}`);
      return;
    }

    const formattedRole = newRole.replace('_', ' ');
    const htmlContent = getProjectRoleUpdatedTemplate({
      name,
      projectName,
      newRole: formattedRole,
      clientUrl,
    });

    await this.transporter.sendMail({
      from: process.env.MAIL_FROM || '"nexTask" <no-reply@nextask.com>',
      to,
      subject: `Role Updated in Project: ${projectName}`,
      html: htmlContent,
    });
  }
}
