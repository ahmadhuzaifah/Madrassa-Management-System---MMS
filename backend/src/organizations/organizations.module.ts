import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService, PrismaService],
})
export class OrganizationsModule {}
