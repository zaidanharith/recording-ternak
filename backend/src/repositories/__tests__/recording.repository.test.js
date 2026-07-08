const prisma = require('../../lib/prisma');

jest.mock('../../lib/prisma', () => ({
  recording: {
    create: jest.fn(),
  },
}));

const { createManualRecording } = require('../recording.repository');

describe('createManualRecording', () => {
  it('persists photoUrl and photoPublicId when provided', async () => {
    prisma.recording.create.mockResolvedValue({ id: 'r1' });

    await createManualRecording({
      goatId: 'g1',
      senderName: 'Admin Satu',
      photoUrl: 'https://res.cloudinary.com/demo/x.jpg',
      photoPublicId: 'recording-ternak/dashboard/x',
    });

    expect(prisma.recording.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        photoUrl: 'https://res.cloudinary.com/demo/x.jpg',
        photoPublicId: 'recording-ternak/dashboard/x',
      }),
    });
  });

  it('defaults photoPublicId to null when not provided', async () => {
    prisma.recording.create.mockResolvedValue({ id: 'r1' });

    await createManualRecording({ goatId: 'g1', senderName: 'Admin Satu' });

    expect(prisma.recording.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ photoPublicId: null }),
    });
  });
});

describe('createRecording', () => {
  it('persists photoUrl and photoPublicId when provided', async () => {
    prisma.recording.create.mockResolvedValue({ id: 'r1' });

    const { createRecording } = require('../recording.repository');
    await createRecording({
      kambingId: 'g1',
      pengirim: 'Budi',
      photoUrl: 'https://res.cloudinary.com/demo/wa.jpg',
      photoPublicId: 'recording-ternak/whatsapp/wa',
    });

    expect(prisma.recording.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        photoUrl: 'https://res.cloudinary.com/demo/wa.jpg',
        photoPublicId: 'recording-ternak/whatsapp/wa',
      }),
    });
  });

  it('defaults photo fields to null when not provided', async () => {
    prisma.recording.create.mockResolvedValue({ id: 'r1' });

    const { createRecording } = require('../recording.repository');
    await createRecording({ kambingId: 'g1', pengirim: 'Budi' });

    expect(prisma.recording.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ photoUrl: null, photoPublicId: null }),
    });
  });
});
