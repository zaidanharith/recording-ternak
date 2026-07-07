const {
  createMessage,
  getRecentMessages,
  deleteOldMessages,
} = require('../repositories/chat-message.repository');

const HISTORY_LIMIT = 10;
const PRUNE_AFTER_DAYS = 30;

const buildHistoryContext = async (phone) => {
  const messages = await getRecentMessages(phone, HISTORY_LIMIT);
  if (messages.length === 0) return '';

  const transcript = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Bot'}: ${m.content}`)
    .join('\n');

  return `[Riwayat percakapan terakhir]\n${transcript}`;
};

const logTurn = async (phone, userMessage, botReply) => {
  await createMessage(phone, 'user', userMessage);
  await createMessage(phone, 'bot', botReply);
};

const pruneHistory = async (phone) => {
  await deleteOldMessages(phone, PRUNE_AFTER_DAYS);
};

module.exports = { buildHistoryContext, logTurn, pruneHistory };
