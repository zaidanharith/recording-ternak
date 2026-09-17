const prisma = require('../../lib/prisma');

jest.mock('../../lib/prisma', () => ({
  recording: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
}));

const { createManualRecording } = require('../recording.repository');

describe('createManualRecording', () => {
  it('persists photoUrls and photoPublicIds when provided', async () => {
    prisma.recording.create.mockResolvedValue({ id: 'r1' });

    await createManualRecording({
      goatId: 'g1',
      senderName: 'Admin Satu',
      photoUrls: ['https://res.cloudinary.com/demo/x.jpg'],
      photoPublicIds: ['recording-ternak/dashboard/x'],
    });

    expect(prisma.recording.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        photoUrls: ['https://res.cloudinary.com/demo/x.jpg'],
        photoPublicIds: ['recording-ternak/dashboard/x'],
      }),
    });
  });

  it('defaults photo fields to empty arrays when not provided', async () => {
    prisma.recording.create.mockResolvedValue({ id: 'r1' });

    await createManualRecording({ goatId: 'g1', senderName: 'Admin Satu' });

    expect(prisma.recording.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ photoUrls: [], photoPublicIds: [] }),
    });
  });
});

describe('createRecording', () => {
  it('wraps photoUrl and photoPublicId into single-element arrays when provided', async () => {
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
        photoUrls: ['https://res.cloudinary.com/demo/wa.jpg'],
        photoPublicIds: ['recording-ternak/whatsapp/wa'],
      }),
    });
  });

  it('defaults photo fields to empty arrays when not provided', async () => {
    prisma.recording.create.mockResolvedValue({ id: 'r1' });

    const { createRecording } = require('../recording.repository');
    await createRecording({ kambingId: 'g1', pengirim: 'Budi' });

    expect(prisma.recording.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ photoUrls: [], photoPublicIds: [] }),
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

describe('exportRecordings', () => {
  const { exportRecordings } = require('../recording.repository');

  it('applies status/sold/condition/source filters, caps rows, and sorts by birthDate', async () => {
    prisma.recording.findMany.mockResolvedValue([]);

    await exportRecordings({
      status: 'FINAL',
      sold: 'YA',
      condition: 'SEHAT',
      source: 'MANUAL',
      sortBy: 'birthDate',
      sortDir: 'desc',
    });

    expect(prisma.recording.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'FINAL', sold: 'YA', condition: 'SEHAT', source: 'MANUAL' },
        orderBy: { birthDate: 'desc' },
        take: 5000,
      })
    );
  });

  it('sorts by nested farmer name when sortBy is farmer', async () => {
    prisma.recording.findMany.mockResolvedValue([]);

    await exportRecordings({ sortBy: 'farmer', sortDir: 'asc' });

    expect(prisma.recording.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { goat: { farmer: { name: 'asc' } } } })
    );
  });

  it('sorts by nested goat ear tag number when sortBy is goat', async () => {
    prisma.recording.findMany.mockResolvedValue([]);

    await exportRecordings({ sortBy: 'goat', sortDir: 'asc' });

    expect(prisma.recording.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { goat: { earTagNumber: 'asc' } } })
    );
  });

  it('applies a recordingDate range filter', async () => {
    prisma.recording.findMany.mockResolvedValue([]);

    await exportRecordings({
      startDate: '2026-07-01',
      endDate: '2026-07-10',
      sortBy: 'birthDate',
      sortDir: 'desc',
    });

    const callArgs = prisma.recording.findMany.mock.calls[0][0];
    expect(callArgs.where.recordingDate.gte.toISOString().slice(0, 10)).toBe('2026-07-01');
    expect(callArgs.where.recordingDate.lt.toISOString().slice(0, 10)).toBe('2026-07-11');
  });
});
