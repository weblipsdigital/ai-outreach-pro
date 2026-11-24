import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';
import { logAudit } from '../utils/audit.js';

const JWT_SECRET = process.env.JWT_SECRET || 'outreach_jwt_default_secret_key';

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const defaultPassword = 'Admin@Outreach2026!';
      const envPassword = process.env.ADMIN_PASSWORD;

      let user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      // Recognized admin emails
      const isKnownAdmin =
        normalizedEmail === 'admin@aioutreachpro.local' ||
        normalizedEmail === (process.env.ADMIN_EMAIL || '').toLowerCase() ||
        normalizedEmail === (process.env.AGENCY_EMAIL || '').toLowerCase() ||
        normalizedEmail === 'suraj.mchakghat@gmail.com' ||
        normalizedEmail === 'support@weblipsdigital.in';

      // Auto-create recognized admin user if not in database yet
      if (!user && isKnownAdmin) {
        const passwordHash = await bcrypt.hash(password, 10);
        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: normalizedEmail.split('@')[0],
            passwordHash,
            role: 'ADMIN',
          },
        });
      }

      // If database has 0 users, auto-bootstrap the first user as admin
      if (!user) {
        const totalUsers = await prisma.user.count();
        if (totalUsers === 0) {
          const passwordHash = await bcrypt.hash(password, 10);
          user = await prisma.user.create({
            data: {
              email: normalizedEmail,
              name: 'System Administrator',
              passwordHash,
              role: 'ADMIN',
            },
          });
        }
      }

      if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      // Check password: match against stored hash OR master default / env passwords
      const validPassword =
        (await bcrypt.compare(password, user.passwordHash)) ||
        password === defaultPassword ||
        (envPassword && password === envPassword);

      if (!validPassword) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      // Sync stored password hash if matching master password
      if (password === defaultPassword || (envPassword && password === envPassword)) {
        const newHash = await bcrypt.hash(password, 10);
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: newHash },
        });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      await logAudit({
        userId: user.id,
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: user.id,
        ipAddress: req.ip || req.socket.remoteAddress,
      });

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Login failed' });
    }
  }

  // Setup / verify default admin accounts
  async setupAdmin(req: Request, res: Response) {
    try {
      const defaultPassword = 'Admin@Outreach2026!';
      const passwordHash = await bcrypt.hash(defaultPassword, 10);

      const emailsToSetup = Array.from(
        new Set([
          'admin@aioutreachpro.local',
          'suraj.mchakghat@gmail.com',
          'support@weblipsdigital.in',
          process.env.ADMIN_EMAIL?.trim().toLowerCase(),
          process.env.AGENCY_EMAIL?.trim().toLowerCase(),
        ].filter(Boolean))
      ) as string[];

      const readyUsers: string[] = [];

      for (const email of emailsToSetup) {
        if (!email.includes('@')) continue;
        await prisma.user.upsert({
          where: { email },
          update: { passwordHash },
          create: {
            email,
            name: email.split('@')[0],
            passwordHash,
            role: 'ADMIN',
          },
        });
        readyUsers.push(email);
      }

      res.json({
        success: true,
        message: 'Admin accounts successfully configured and ready for login.',
        defaultPassword: 'Admin@Outreach2026!',
        users: readyUsers,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Setup failed' });
    }
  }

  async logout(req: Request, res: Response) {
    res.json({ success: true, message: 'Logged out successfully' });
  }

  async me(req: any, res: Response) {
    res.json({ user: req.user });
  }
}

export const authController = new AuthController();
