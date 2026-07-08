jest.mock('../gemini.service');
jest.mock('../session.service');
jest.mock('../../repositories/farmer.repository');
jest.mock('../../repositories/goat.repository');
jest.mock('../../repositories/recording.repository');
jest.mock('../sheets.service');
jest.mock('../whatsapp.service');
jest.mock('../query.service');
jest.mock('../sync.service');
jest.mock('../chat-history.service');

const { parseMessage } = require('../gemini.service');
const { setSession, getSession, clearSession } = require('../session.service');
const { findOrCreateFarmer } = require('../../repositories/farmer.repository');
const { findOrCreateGoat } = require('../../repositories/goat.repository');
const { createRecording } = require('../../repositories/recording.repository');
const { sendTextMessage } = require('../whatsapp.service');
const { buildHistoryContext, logTurn, pruneHistory } = require('../chat-history.service');
const { verifySheetsConsistency } = require('../sync.service');

const { handleMessage } = require('../recording.service');

const PHOTO = { url: 'https://res.cloudinary.com/demo/wa.jpg', publicId: 'recording-ternak/whatsapp/wa' };

beforeEach(() => {
  buildHistoryContext.mockResolvedValue('');
  pruneHistory.mockResolvedValue();
  logTurn.mockResolvedValue();
  verifySheetsConsistency.mockResolvedValue();
  sendTextMessage.mockResolvedValue({});
});

describe('handleMessage photo propagation', () => {
  it('stores the photo on session data when asking for nomor telinga', async () => {
    getSession.mockResolvedValue(null);
    parseMessage.mockResolvedValue({
      bukan_laporan_ternak: false,
      nomor_telinga: '-',
      nama_peternak: 'Budi',
    });

    await handleMessage('kambing beranak 2 ekor', '628123', 'Budi', PHOTO);

    expect(setSession).toHaveBeenCalledWith(
      '628123',
      'awaiting_nomor_telinga',
      expect.objectContaining({ photo: PHOTO })
    );
  });

  it('carries the photo from awaiting_nomor_telinga into awaiting_confirmation', async () => {
    getSession.mockResolvedValue({
      state: 'awaiting_nomor_telinga',
      data: { parsed: { nama_peternak: 'Budi' }, namaPeternak: 'Budi', photo: PHOTO },
    });

    await handleMessage('12', '628123', 'Budi');

    expect(setSession).toHaveBeenCalledWith(
      '628123',
      'awaiting_confirmation',
      expect.objectContaining({ photo: PHOTO })
    );
  });

  it('passes photoUrl/photoPublicId to createRecording on confirmation', async () => {
    getSession.mockResolvedValue({
      state: 'awaiting_confirmation',
      data: {
        parsed: { tanggal_kawin: '-', tanggal_beranak: '-', jumlah_anak_jantan: '-', jumlah_anak_betina: '-', perkawinan_ke: '-', target_penjualan: '-', terjual: '-', catatan: '-' },
        nomorTelinga: '12',
        namaPeternak: 'Budi',
        photo: PHOTO,
      },
    });
    findOrCreateFarmer.mockResolvedValue({ id: 'f1', name: 'Budi', address: '-', whatsappPhone: '628123' });
    findOrCreateGoat.mockResolvedValue({ id: 'g1', earTagNumber: '12' });
    createRecording.mockResolvedValue({ id: 'r1' });
    clearSession.mockResolvedValue();

    await handleMessage('ya', '628123', 'Budi');

    expect(createRecording).toHaveBeenCalledWith(
      expect.objectContaining({ photoUrl: PHOTO.url, photoPublicId: PHOTO.publicId })
    );
  });
});
