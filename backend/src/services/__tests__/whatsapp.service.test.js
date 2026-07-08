const { getMediaUrl, downloadMedia } = require('../whatsapp.service');

describe('getMediaUrl', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('fetches the media metadata and returns url and mimeType', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://lookaside.fbsbx.com/media/abc', mime_type: 'image/jpeg' }),
    });

    const result = await getMediaUrl('media-id-123');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/media-id-123'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: expect.stringContaining('Bearer') }) })
    );
    expect(result).toEqual({ url: 'https://lookaside.fbsbx.com/media/abc', mimeType: 'image/jpeg' });
  });

  it('throws when the response is not ok', async () => {
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'not found' }) });

    await expect(getMediaUrl('bad-id')).rejects.toThrow();
  });
});

describe('downloadMedia', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('downloads the media bytes as a Buffer', async () => {
    const fakeBytes = new Uint8Array([1, 2, 3]).buffer;
    global.fetch.mockResolvedValue({ ok: true, arrayBuffer: async () => fakeBytes });

    const buffer = await downloadMedia('https://lookaside.fbsbx.com/media/abc');

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer).toEqual(Buffer.from([1, 2, 3]));
  });

  it('throws when the response is not ok', async () => {
    global.fetch.mockResolvedValue({ ok: false });

    await expect(downloadMedia('https://lookaside.fbsbx.com/media/abc')).rejects.toThrow();
  });
});
