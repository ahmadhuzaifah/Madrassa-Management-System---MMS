import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({ take: 20 });
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
