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

      let user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      // Auto-bootstrap: If database has NO users at all (unseeded fresh database),
      // create the first admin user on demand so login never gets blocked!
      if (!user) {
        const totalUsers = await prisma.user.count();
        if (totalUsers === 0) {
          const passwordHash = await bcrypt.hash(password, 10);
          user = await prisma.user.create({
            data: {
              email: email.toLowerCase(),
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

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
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
      const adminEmail = (process.env.ADMIN_EMAIL || 'admin@aioutreachpro.local').toLowerCase();
      const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@Outreach2026!';
      const passwordHash = await bcrypt.hash(adminPassword, 10);

      const defaultAdmin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: { passwordHash },
        create: {
          email: adminEmail,
          name: 'System Administrator',
          passwordHash,
          role: 'ADMIN',
        },
      });

      const agencyEmail = process.env.AGENCY_EMAIL?.trim().toLowerCase();
      let agencyAdmin = null;
      if (agencyEmail && agencyEmail !== adminEmail && agencyEmail.includes('@')) {
        agencyAdmin = await prisma.user.upsert({
          where: { email: agencyEmail },
          update: { passwordHash },
          create: {
            email: agencyEmail,
            name: process.env.AGENCY_NAME || 'Agency Admin',
            passwordHash,
            role: 'ADMIN',
          },
        });
      }

      res.json({
        success: true,
        message: 'Admin accounts successfully configured and ready for login.',
        users: [defaultAdmin.email, agencyAdmin?.email].filter(Boolean),
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
