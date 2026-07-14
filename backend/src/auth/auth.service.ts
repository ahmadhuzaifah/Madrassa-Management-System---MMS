import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto) {
    return { message: 'Registration scaffold ready', dto };
  }

  async login(dto: LoginDto) {
    return { message: 'Login scaffold ready', dto };
  }
}
