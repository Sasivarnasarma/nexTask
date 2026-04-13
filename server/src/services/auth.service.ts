import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/apiError.util';
import { hashPassword, verifyPassword } from '../utils/hash.util';
import { generateToken } from '../utils/jwt.util';

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthData {
  token: string;
}

export class AuthService {
  public async register(data: RegisterRequest): Promise<AuthData> {
    const isPublicRegistrationAllowed = process.env.ALLOW_PUBLIC_REGISTRATION === 'true';

    if (!isPublicRegistrationAllowed) {
      throw new ApiError(403, 'Public registration is currently disabled.');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ApiError(409, 'An account with this email already exists.');
    }

    const hashedPassword = await hashPassword(data.password);

    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        mustResetPassword: true,
      },
    });

    const token = generateToken({
      userId: newUser.id,
      role: newUser.role,
      mustResetPassword: newUser.mustResetPassword,
    });

    return { token };
  }

  public async login(data: LoginRequest): Promise<AuthData> {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new ApiError(401, 'Invalid email or password.');
    }

    const isPasswordValid = await verifyPassword(user.password, data.password);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password.');
    }

    const token = generateToken({
      userId: user.id,
      role: user.role,
      mustResetPassword: user.mustResetPassword,
    });

    return { token };
  }
}
