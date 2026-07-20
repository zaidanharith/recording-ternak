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

const { parseMessage, classifyMessageInConfirmation } = require('../gemini.service');
const { setSession, getSession, clearSession } = require('../session.service');
const { findOrCreateFarmer, getFarmerByPhone } = require('../../repositories/farmer.repository');
const { findOrCreateGoat } = require('../../repositories/goat.repository');
const { createRecording } = require('../../repositories/recording.repository');
const { sendTextMessage } = require('../whatsapp.service');
const { buildHistoryContext, logTurn, pruneHistory } = require('../chat-history.service');
const { verifySheetsConsistency } = require('../sync.service');

const { handleMessage, handleUnregisteredSender } = require('../recording.service');

const PHOTO = { url: 'https://res.cloudinary.com/demo/wa.jpg', publicId: 'recording-ternak/whatsapp/wa' };

beforeEach(() => {
  buildHistoryContext.mockResolvedValue('');
  pruneHistory.mockResolvedValue();
  logTurn.mockResolvedValue();
  verifySheetsConsistency.mockResolvedValue();
  sendTextMessage.mockResolvedValue({});
  getFarmerByPhone.mockResolvedValue(null);
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

  it('deletes the old session photo when a new photo replaces it via the caption path', async () => {
    const OLD_PHOTO = { url: 'https://res.cloudinary.com/demo/old.jpg', publicId: 'recording-ternak/whatsapp/old' };
    getSession.mockResolvedValue({
      state: 'awaiting_nomor_telinga',
      data: { parsed: { nama_peternak: 'Budi' }, namaPeternak: 'Budi', photo: OLD_PHOTO },
    });

    await handleMessage('12', '628123', 'Budi', PHOTO);

    expect(cloudinaryService.deleteImage).toHaveBeenCalledWith(OLD_PHOTO.publicId);
    expect(setSession).toHaveBeenCalledWith(
      '628123',
      'awaiting_confirmation',
      expect.objectContaining({ photo: PHOTO })
    );
  });

  it('does not delete the session photo when it is only carried forward with no new photo passed', async () => {
    getSession.mockResolvedValue({
      state: 'awaiting_nomor_telinga',
      data: { parsed: { nama_peternak: 'Budi' }, namaPeternak: 'Budi', photo: PHOTO },
    });

    await handleMessage('12', '628123', 'Budi');

    expect(cloudinaryService.deleteImage).not.toHaveBeenCalled();
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
    findOrCreateFarmer.mockResolvedValue({ id: 'f1', name: 'Budi', desa: '-', dusun: '-', rt: '-', rw: '-', whatsappPhone: '628123' });
    findOrCreateGoat.mockResolvedValue({ id: 'g1', earTagNumber: '12' });
    createRecording.mockResolvedValue({ id: 'r1' });
    clearSession.mockResolvedValue();

    await handleMessage('ya', '628123', 'Budi');

    expect(createRecording).toHaveBeenCalledWith(
      expect.objectContaining({ photoUrl: PHOTO.url, photoPublicId: PHOTO.publicId })
    );
  });

  it('carries a photo_staged session photo into the report once the text report arrives', async () => {
    getSession.mockResolvedValue({
      state: 'photo_staged',
      data: { photo: PHOTO },
    });
    parseMessage.mockResolvedValue({
      bukan_laporan_ternak: false,
      nomor_telinga: '-',
      nama_peternak: 'Budi',
    });

    await handleMessage('kambing beranak 2 ekor', '628123', 'Budi');

    expect(setSession).toHaveBeenCalledWith(
      '628123',
      'awaiting_nomor_telinga',
      expect.objectContaining({ photo: PHOTO })
    );
  });
});

describe('handleMessage nomor telinga prompt with registered goat list', () => {
  it('lists the farmer\'s registered ear tag numbers, sorted, when a fresh report omits the number', async () => {
    getSession.mockResolvedValue(null);
    parseMessage.mockResolvedValue({
      bukan_laporan_ternak: false,
      nomor_telinga: '-',
      nama_peternak: 'Budi',
    });
    getFarmerByPhone.mockResolvedValue({
      id: 'f1',
      goats: [{ earTagNumber: 105 }, { earTagNumber: 12 }],
    });

    await handleMessage('kambing beranak 2 ekor', '628123', 'Budi');

    expect(getFarmerByPhone).toHaveBeenCalledWith('628123');
    const reply = sendTextMessage.mock.calls[0][1];
    expect(reply).toContain('🐐 12');
    expect(reply).toContain('🐐 105');
    expect(reply.indexOf('🐐 12')).toBeLessThan(reply.indexOf('🐐 105'));
  });

  it('does not show a goat list section when the farmer has no registered goats', async () => {
    getSession.mockResolvedValue(null);
    parseMessage.mockResolvedValue({
      bukan_laporan_ternak: false,
      nomor_telinga: '-',
      nama_peternak: 'Budi',
    });
    getFarmerByPhone.mockResolvedValue({ id: 'f1', goats: [] });

    await handleMessage('kambing beranak 2 ekor', '628123', 'Budi');

    const reply = sendTextMessage.mock.calls[0][1];
    expect(reply).not.toContain('terdaftar atas nama Anda');
  });

  it('lists registered ear tag numbers when a revision also omits the number', async () => {
    getSession.mockResolvedValue({
      state: 'awaiting_confirmation',
      data: { parsed: { nama_peternak: 'Budi' }, nomorTelinga: '12', namaPeternak: 'Budi' },
    });
    classifyMessageInConfirmation.mockResolvedValue({
      intent: 'REVISI',
      parsed: { nomor_telinga: '-', nama_peternak: 'Budi' },
    });
    getFarmerByPhone.mockResolvedValue({ id: 'f1', goats: [{ earTagNumber: 7 }] });

    await handleMessage('eh salah, kambingnya beranak lagi ternyata', '628123', 'Budi');

    expect(getFarmerByPhone).toHaveBeenCalledWith('628123');
    const reply = sendTextMessage.mock.calls[0][1];
    expect(reply).toContain('🐐 7');
  });
});

describe('handleUnregisteredSender', () => {
  it('sends a welcome/rejection message and returns the unregistered_sender state', async () => {
    const result = await handleUnregisteredSender('628999');

    expect(sendTextMessage).toHaveBeenCalledWith('628999', expect.stringContaining('belum terdaftar'));
    expect(result).toEqual({ state: 'unregistered_sender' });
  });
});

const whatsappService = require('../whatsapp.service');
const cloudinaryService = require('../cloudinary.service');
jest.mock('../cloudinary.service');

const { handleImageMessage } = require('../recording.service');

describe('handleImageMessage', () => {
  it('uploads and stages the photo when there is no caption and no active session', async () => {
    getSession.mockResolvedValue(null);
    whatsappService.getMediaUrl.mockResolvedValue({ url: 'https://lookaside.fbsbx.com/media/abc', mimeType: 'image/jpeg' });
    whatsappService.downloadMedia.mockResolvedValue(Buffer.from('bytes'));
    cloudinaryService.uploadImage.mockResolvedValue({ url: 'https://res.cloudinary.com/demo/wa.jpg', publicId: 'recording-ternak/whatsapp/wa' });

    const result = await handleImageMessage('media-1', '', '628123', 'Budi');

    expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(Buffer.from('bytes'), 'recording-ternak/whatsapp');
    expect(setSession).toHaveBeenCalledWith(
      '628123',
      'photo_staged',
      expect.objectContaining({ photo: { url: 'https://res.cloudinary.com/demo/wa.jpg', publicId: 'recording-ternak/whatsapp/wa' } })
    );
    expect(sendTextMessage).toHaveBeenCalledWith('628123', expect.stringContaining('teks'));
    expect(result.state).toBe('photo_staged');
  });

  it('deletes a previously staged photo when a second bare photo arrives with still no session', async () => {
    getSession.mockResolvedValue({
      state: 'photo_staged',
      data: { photo: { url: 'https://res.cloudinary.com/demo/old.jpg', publicId: 'recording-ternak/whatsapp/old' } },
    });
    whatsappService.getMediaUrl.mockResolvedValue({ url: 'https://lookaside.fbsbx.com/media/abc', mimeType: 'image/jpeg' });
    whatsappService.downloadMedia.mockResolvedValue(Buffer.from('bytes'));
    cloudinaryService.uploadImage.mockResolvedValue({ url: 'https://res.cloudinary.com/demo/new.jpg', publicId: 'recording-ternak/whatsapp/new' });

    const result = await handleImageMessage('media-1', '', '628123', 'Budi');

    expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('recording-ternak/whatsapp/old');
    expect(setSession).toHaveBeenCalledWith(
      '628123',
      'photo_staged',
      expect.objectContaining({ photo: { url: 'https://res.cloudinary.com/demo/new.jpg', publicId: 'recording-ternak/whatsapp/new' } })
    );
    expect(result.state).toBe('photo_staged');
  });

  it('uploads, merges, and re-sends the confirmation summary when a photo lands in awaiting_confirmation with no caption', async () => {
    getSession.mockResolvedValue({
      state: 'awaiting_confirmation',
      data: { parsed: { nama_peternak: 'Budi' }, nomorTelinga: '12', namaPeternak: 'Budi' },
    });
    whatsappService.getMediaUrl.mockResolvedValue({ url: 'https://lookaside.fbsbx.com/media/abc', mimeType: 'image/jpeg' });
    whatsappService.downloadMedia.mockResolvedValue(Buffer.from('bytes'));
    cloudinaryService.uploadImage.mockResolvedValue({ url: 'https://res.cloudinary.com/demo/wa.jpg', publicId: 'recording-ternak/whatsapp/wa' });

    const result = await handleImageMessage('media-1', '', '628123', 'Budi');

    expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(Buffer.from('bytes'), 'recording-ternak/whatsapp');
    expect(setSession).toHaveBeenCalledWith(
      '628123',
      'awaiting_confirmation',
      expect.objectContaining({ photo: { url: 'https://res.cloudinary.com/demo/wa.jpg', publicId: 'recording-ternak/whatsapp/wa' } })
    );
    expect(sendTextMessage).toHaveBeenCalledWith('628123', expect.stringContaining('sudah dilampirkan'));
    expect(sendTextMessage).toHaveBeenCalledWith('628123', expect.stringContaining('Ringkasan'));
    expect(result.state).toBe('awaiting_confirmation');
  });

  it('uploads, merges, and sends a short ack when a photo lands in awaiting_nomor_telinga with no caption', async () => {
    getSession.mockResolvedValue({
      state: 'awaiting_nomor_telinga',
      data: { parsed: { nama_peternak: 'Budi' }, namaPeternak: 'Budi' },
    });
    whatsappService.getMediaUrl.mockResolvedValue({ url: 'https://lookaside.fbsbx.com/media/abc', mimeType: 'image/jpeg' });
    whatsappService.downloadMedia.mockResolvedValue(Buffer.from('bytes'));
    cloudinaryService.uploadImage.mockResolvedValue({ url: 'https://res.cloudinary.com/demo/wa.jpg', publicId: 'recording-ternak/whatsapp/wa' });

    const result = await handleImageMessage('media-1', '', '628123', 'Budi');

    expect(setSession).toHaveBeenCalledWith(
      '628123',
      'awaiting_nomor_telinga',
      expect.objectContaining({ photo: { url: 'https://res.cloudinary.com/demo/wa.jpg', publicId: 'recording-ternak/whatsapp/wa' } })
    );
    expect(sendTextMessage).toHaveBeenCalledWith('628123', expect.stringContaining('ditambahkan ke laporan'));
    expect(result.state).toBe('photo_attached');
  });

  it('uploads and feeds the caption through handleMessage when a caption is present', async () => {
    getSession.mockResolvedValue(null);
    whatsappService.getMediaUrl.mockResolvedValue({ url: 'https://lookaside.fbsbx.com/media/abc', mimeType: 'image/jpeg' });
    whatsappService.downloadMedia.mockResolvedValue(Buffer.from('bytes'));
    cloudinaryService.uploadImage.mockResolvedValue({ url: 'https://res.cloudinary.com/demo/wa.jpg', publicId: 'recording-ternak/whatsapp/wa' });
    parseMessage.mockResolvedValue({ bukan_laporan_ternak: false, nomor_telinga: '12', nama_peternak: 'Budi' });

    const result = await handleImageMessage('media-1', 'kambing 12 beranak 2 ekor', '628123', 'Budi');

    expect(setSession).toHaveBeenCalledWith(
      '628123',
      'awaiting_confirmation',
      expect.objectContaining({ photo: { url: 'https://res.cloudinary.com/demo/wa.jpg', publicId: 'recording-ternak/whatsapp/wa' } })
    );
    expect(result.state).toBe('awaiting_confirmation');
    expect(cloudinaryService.deleteImage).not.toHaveBeenCalled();
  });

  it('deletes the uploaded photo when the caption resolves to a non-attaching state (bukan laporan ternak)', async () => {
    getSession.mockResolvedValue(null);
    whatsappService.getMediaUrl.mockResolvedValue({ url: 'https://lookaside.fbsbx.com/media/abc', mimeType: 'image/jpeg' });
    whatsappService.downloadMedia.mockResolvedValue(Buffer.from('bytes'));
    cloudinaryService.uploadImage.mockResolvedValue({ url: 'https://res.cloudinary.com/demo/wa.jpg', publicId: 'recording-ternak/whatsapp/wa' });
    parseMessage.mockResolvedValue({ bukan_laporan_ternak: true });

    const result = await handleImageMessage('media-1', 'halo apa kabar', '628123', 'Budi');

    expect(result.state).toBe('chat_replied');
    expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('recording-ternak/whatsapp/wa');
  });

  it('deletes the previous photo when a second photo overwrites an already-attached session photo', async () => {
    getSession.mockResolvedValue({
      state: 'awaiting_confirmation',
      data: {
        parsed: { nama_peternak: 'Budi' },
        nomorTelinga: '12',
        namaPeternak: 'Budi',
        photo: { url: 'https://res.cloudinary.com/demo/old.jpg', publicId: 'recording-ternak/whatsapp/old' },
      },
    });
    whatsappService.getMediaUrl.mockResolvedValue({ url: 'https://lookaside.fbsbx.com/media/abc', mimeType: 'image/jpeg' });
    whatsappService.downloadMedia.mockResolvedValue(Buffer.from('bytes'));
    cloudinaryService.uploadImage.mockResolvedValue({ url: 'https://res.cloudinary.com/demo/new.jpg', publicId: 'recording-ternak/whatsapp/new' });

    const result = await handleImageMessage('media-1', '', '628123', 'Budi');

    expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('recording-ternak/whatsapp/old');
    expect(setSession).toHaveBeenCalledWith(
      '628123',
      'awaiting_confirmation',
      expect.objectContaining({ photo: { url: 'https://res.cloudinary.com/demo/new.jpg', publicId: 'recording-ternak/whatsapp/new' } })
    );
    expect(result.state).toBe('awaiting_confirmation');
  });

  it('rejects an unsupported mime type without uploading to Cloudinary', async () => {
    getSession.mockResolvedValue(null);
    whatsappService.getMediaUrl.mockResolvedValue({ url: 'https://lookaside.fbsbx.com/media/abc', mimeType: 'image/gif' });

    const result = await handleImageMessage('media-1', 'kambing 12 beranak', '628123', 'Budi');

    expect(whatsappService.downloadMedia).not.toHaveBeenCalled();
    expect(cloudinaryService.uploadImage).not.toHaveBeenCalled();
    expect(result.state).toBe('invalid_photo');
  });
});
