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

describe('parseRecordingDate', () => {
  const { parseRecordingDate } = require('../recording.repository');

  it('returns null for "-", empty string, and undefined', () => {
    expect(parseRecordingDate('-')).toBeNull();
    expect(parseRecordingDate('')).toBeNull();
    expect(parseRecordingDate(undefined)).toBeNull();
  });

  it('parses a valid ISO date string into a Date', () => {
    const result = parseRecordingDate('2026-07-11');
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString().slice(0, 10)).toBe('2026-07-11');
  });

  it('throws on an unparseable date string', () => {
    expect(() => parseRecordingDate('bukan tanggal')).toThrow('Tanggal tidak valid, gunakan format YYYY-MM-DD (contoh: 2026-07-11).');
  });
});

describe('parseSoldStatus', () => {
  const { parseSoldStatus } = require('../recording.repository');

  it('returns null for "-", empty string, and undefined', () => {
    expect(parseSoldStatus('-')).toBeNull();
    expect(parseSoldStatus('')).toBeNull();
    expect(parseSoldStatus(undefined)).toBeNull();
  });

  it('maps case-insensitive Ya/Tidak/Belum and the enum values themselves', () => {
    expect(parseSoldStatus('Ya')).toBe('YA');
    expect(parseSoldStatus('tidak')).toBe('TIDAK');
    expect(parseSoldStatus('Belum')).toBe('TIDAK');
    expect(parseSoldStatus('YA')).toBe('YA');
    expect(parseSoldStatus('TIDAK')).toBe('TIDAK');
  });

  it('throws on an unrecognized value', () => {
    expect(() => parseSoldStatus('2 ekor')).toThrow('Status terjual harus "Ya" atau "Tidak".');
  });
});

describe('parseGoatCondition', () => {
  const { parseGoatCondition } = require('../recording.repository');

  it('returns null for "-", empty string, and undefined', () => {
    expect(parseGoatCondition('-')).toBeNull();
    expect(parseGoatCondition('')).toBeNull();
    expect(parseGoatCondition(undefined)).toBeNull();
  });

  it('maps case-insensitive Sehat/Sakit and the enum values themselves', () => {
    expect(parseGoatCondition('Sehat')).toBe('SEHAT');
    expect(parseGoatCondition('sakit')).toBe('SAKIT');
    expect(parseGoatCondition('SEHAT')).toBe('SEHAT');
  });

  it('throws on an unrecognized value', () => {
    expect(() => parseGoatCondition('lumayan')).toThrow('Kondisi harus "Sehat" atau "Sakit".');
  });
});
