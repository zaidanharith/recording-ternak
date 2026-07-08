const cloudinaryService = require('../../services/cloudinary.service');

jest.mock('../../services/cloudinary.service');

const { uploadPhoto } = require('../uploads.controller');

const buildRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe('uploadPhoto', () => {
  it('returns 400 when no file is attached', async () => {
    const req = { file: undefined };
    const res = buildRes();

    await uploadPhoto(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(cloudinaryService.uploadImage).not.toHaveBeenCalled();
  });

  it('uploads the file buffer to the dashboard folder and returns url/publicId', async () => {
    cloudinaryService.uploadImage.mockResolvedValue({ url: 'https://res.cloudinary.com/demo/x.jpg', publicId: 'recording-ternak/dashboard/x' });
    const req = { file: { buffer: Buffer.from('bytes'), mimetype: 'image/jpeg' } };
    const res = buildRes();

    await uploadPhoto(req, res);

    expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(req.file.buffer, 'recording-ternak/dashboard');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { url: 'https://res.cloudinary.com/demo/x.jpg', publicId: 'recording-ternak/dashboard/x' },
    });
  });

  it('returns 500 when the cloudinary upload throws', async () => {
    cloudinaryService.uploadImage.mockRejectedValue(new Error('cloudinary down'));
    const req = { file: { buffer: Buffer.from('bytes'), mimetype: 'image/jpeg' } };
    const res = buildRes();

    await uploadPhoto(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
