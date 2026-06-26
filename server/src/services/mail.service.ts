import nodemailer from 'nodemailer';

import { getAdminPasswordResetTemplate } from '../templates/admin-password-reset';
import { getForgotPasswordTemplate } from '../templates/forgot-password';
import { getProjectAddedTemplate } from '../templates/project-added';
import { getProjectRemovedTemplate } from '../templates/project-removed';
import { getProjectRoleUpdatedTemplate } from '../templates/project-role-updated';
import { getTaskAssignmentTemplate } from '../templates/task-assignment';
import { getUserRemovedTemplate } from '../templates/user-removed';
import { getUserStatusChangedTemplate } from '../templates/user-status-changed';
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

  public async sendAdminPasswordResetEmail(to: string, name: string | null): Promise<void> {
    const displayName = name || 'Team Member';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    if (!this.transporter) {
      console.log(
        `[MAIL_WARN] SMTP not configured. Password Reset request email for ${to} printed below:`,
      );
      console.log(` -> Action: Prompt user to log in and change password.`);
      return;
    }

    const htmlContent = getAdminPasswordResetTemplate({
      email: to,
      name: displayName,
      clientUrl,
    });

    await this.transporter.sendMail({
      from: process.env.MAIL_FROM || '"nexTask" <no-reply@nextask.com>',
      to,
      subject: 'nexTask - Password Reset Required',
      html: htmlContent,
    });
  }

  public async sendForgotPasswordEmail(
    to: string,
    name: string | null,
    resetLink: string,
  ): Promise<void> {
    const displayName = name || 'User';

    if (!this.transporter) {
      console.log(`[MAIL_WARN] SMTP not configured. Forgot Password link for ${to} printed below:`);
      console.log(` -> Reset Link: ${resetLink}`);
      return;
    }

    const htmlContent = getForgotPasswordTemplate({
      email: to,
      name: displayName,
      resetLink,
    });

    await this.transporter.sendMail({
      from: process.env.MAIL_FROM || '"nexTask" <no-reply@nextask.com>',
      to,
      subject: 'nexTask - Reset Your Password',
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

  public async sendUserRemovedEmail(to: string, name: string | null): Promise<void> {
    const displayName = name || 'Team Member';

    if (!this.transporter) {
      console.log(
        `[MAIL_WARN] SMTP not configured. User Removed notification for ${to} printed below:`,
      );
      console.log(` -> Action: Notify user that their account was removed.`);
      return;
    }

    const htmlContent = getUserRemovedTemplate({
      email: to,
      name: displayName,
    });

    await this.transporter.sendMail({
      from: process.env.MAIL_FROM || '"nexTask" <no-reply@nextask.com>',
      to,
      subject: 'nexTask - Account Removed',
      html: htmlContent,
    });
  }

  public async sendUserStatusChangedEmail(
    to: string,
    name: string | null,
    isActive: boolean,
  ): Promise<void> {
    const displayName = name || 'Team Member';

    if (!this.transporter) {
      console.log(
        `[MAIL_WARN] SMTP not configured. User Status Changed notification for ${to} printed below:`,
      );
      console.log(` -> Status: ${isActive ? 'Activated' : 'Deactivated'}`);
      return;
    }

    const htmlContent = getUserStatusChangedTemplate({
      email: to,
      name: displayName,
      actionTitle: isActive ? 'Account Activated' : 'Account Deactivated',
      statusMessage: isActive ? 'activated' : 'deactivated',
      statusLabel: isActive ? 'ACTIVE' : 'DEACTIVATED',
      statusDescription: isActive
        ? 'Your account has been successfully reactivated. You can now log in and access all your projects and tasks as normal.'
        : 'Your account has been temporarily deactivated. During this time, you will not be able to log in or receive workspace notifications.',
      statusTextColor: isActive ? '#10b981' : '#f59e0b',
      statusBgColor: isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
      statusBorderColor: isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
    });

    await this.transporter.sendMail({
      from: process.env.MAIL_FROM || '"nexTask" <no-reply@nextask.com>',
      to,
      subject: isActive ? 'nexTask - Account Reactivated' : 'nexTask - Account Deactivated',
      html: htmlContent,
    });
  }
}
