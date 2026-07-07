const prisma = require('../lib/prisma');

const createMessage = async (phone, role, content) => {
  return await prisma.chatMessage.create({
    data: { phone, role, content },
  });
};

const getRecentMessages = async (phone, limit) => {
  const messages = await prisma.chatMessage.findMany({
    where: { phone },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return messages.reverse();
};

const deleteOldMessages = async (phone, olderThanDays) => {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  return await prisma.chatMessage.deleteMany({
    where: { phone, createdAt: { lt: cutoff } },
  });
};

module.exports = { createMessage, getRecentMessages, deleteOldMessages };
