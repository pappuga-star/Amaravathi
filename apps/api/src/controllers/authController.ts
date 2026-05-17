import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { loginSchema, userSchema } from '@amaravathi/shared-types';
import { env } from '../config/env.js';
import { User } from '../models/index.js';
import { created, ok } from '../utils/apiResponse.js';

export async function login(req: Request, res: Response) {
  const body = loginSchema.parse(req.body);
  const user = await User.findOne({ email: body.email, active: true }).select(
    '+passwordHash',
  );
  if (!user || !(await user.comparePassword(body.password))) {
    throw Object.assign(new Error('Invalid email or password'), {
      status: 401,
    });
  }

  const token = jwt.sign(
    { id: String(user._id), role: user.role, email: user.email },
    env.jwtSecret as jwt.Secret,
    { expiresIn: env.jwtExpiresIn } as jwt.SignOptions,
  );
  return ok(res, {
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
}

export async function createUser(req: Request, res: Response) {
  const body = userSchema
    .extend({ password: z.string().min(8) })
    .parse(req.body);
  const user = await User.create({
    name: body.name,
    email: body.email,
    passwordHash: await bcrypt.hash(body.password, 12),
    role: body.role,
    active: body.active,
  });
  return created(res, {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
  });
}

export async function me(req: Request, res: Response) {
  const user = await User.findById(req.user?.id).lean();
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
  return ok(res, {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
  });
}

export async function updateUser(req: Request, res: Response) {
  const body = userSchema.partial().parse(req.body);
  const updateData: any = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.email !== undefined) updateData.email = body.email;
  if (body.role !== undefined) updateData.role = body.role;
  if (body.active !== undefined) updateData.active = body.active;
  
  if (body.password) {
    updateData.passwordHash = await bcrypt.hash(body.password, 12);
  }
  
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: updateData },
    { new: true, runValidators: true }
  );
  
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }
  
  return ok(res, {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
  }, 'Updated');
}

export async function deleteUser(req: Request, res: Response) {
  if (req.user?.id === req.params.id) {
    throw Object.assign(new Error('You cannot delete your own administrative account.'), { status: 400 });
  }
  
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }
  
  return ok(res, { id: req.params.id }, 'Deleted');
}

