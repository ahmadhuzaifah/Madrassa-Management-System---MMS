import { prisma } from './prisma.js';

export async function notifyStudentGuardians(options: {
  organizationId: string;
  studentId: string;
  title: string;
  content: string;
  channel?: 'SMS' | 'EMAIL' | 'WHATSAPP' | 'IN_APP';
}) {
  const channel = options.channel ?? 'IN_APP';
  const parentLinks = await prisma.parentStudent.findMany({
    where: { studentId: options.studentId },
    include: { parentUser: { include: { user: true } } },
  });
  if (!parentLinks.length) return { notifications: 0, messages: 0 };

  const message = await prisma.message.create({
    data: {
      organizationId: options.organizationId,
      senderId: null,
      receiverType: 'GUARDIAN',
      subject: options.title,
      content: options.content,
      channel,
      status: 'SENT',
      sentAt: new Date(),
      recipients: {
        create: parentLinks.map((link: { parentUser: { userId: string } }) => ({
          userId: link.parentUser.userId,
          guardianId: null,
          studentId: options.studentId,
          deliveryStatus: 'DELIVERED',
          readAt: null,
        })),
      },
    },
  });

  await prisma.notification.createMany({
    data: parentLinks.map((link: { parentUser: { userId: string } }) => ({
      userId: link.parentUser.userId,
      title: options.title,
      message: options.content,
      type: 'system',
    })),
  });

  return { notifications: parentLinks.length, messages: 1, messageId: message.id };
}

export async function notifyOrganizationUsers(options: {
  organizationId: string;
  title: string;
  content: string;
  channel?: 'SMS' | 'EMAIL' | 'WHATSAPP' | 'IN_APP';
}) {
  const channel = options.channel ?? 'IN_APP';
  const members = await prisma.organizationMember.findMany({ where: { organizationId: options.organizationId } });
  const userIds = members.map((member: { userId: string }) => member.userId);
  if (!userIds.length) return { notifications: 0, messages: 0 };

  await prisma.message.create({
    data: {
      organizationId: options.organizationId,
      senderId: null,
      receiverType: 'ALL',
      subject: options.title,
      content: options.content,
      channel,
      status: 'SENT',
      sentAt: new Date(),
      recipients: {
        create: userIds.map((userId: string) => ({
          userId,
          deliveryStatus: 'DELIVERED',
        })),
      },
    },
  });

  await prisma.notification.createMany({
    data: userIds.map((userId: string) => ({
      userId,
      title: options.title,
      message: options.content,
      type: 'system',
    })),
  });

  return { notifications: userIds.length, messages: 1 };
}
