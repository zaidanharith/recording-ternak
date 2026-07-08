jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn(),
    },
  },
}));

const cloudinary = require('cloudinary').v2;
const { uploadImage, deleteImage } = require('../cloudinary.service');

describe('uploadImage', () => {
  it('resolves with url and publicId on success', async () => {
    cloudinary.uploader.upload_stream.mockImplementation((options, callback) => {
      callback(null, { secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/recording-ternak/dashboard/abc.jpg', public_id: 'recording-ternak/dashboard/abc' });
      return { end: jest.fn() };
    });

    const result = await uploadImage(Buffer.from('fake-image-bytes'), 'recording-ternak/dashboard');

    expect(result).toEqual({
      url: 'https://res.cloudinary.com/demo/image/upload/v1/recording-ternak/dashboard/abc.jpg',
      publicId: 'recording-ternak/dashboard/abc',
    });
  });

  it('rejects when the Cloudinary upload callback returns an error', async () => {
    cloudinary.uploader.upload_stream.mockImplementation((options, callback) => {
      callback(new Error('cloudinary down'), null);
      return { end: jest.fn() };
    });

    await expect(uploadImage(Buffer.from('x'), 'recording-ternak/dashboard')).rejects.toThrow('cloudinary down');
  });
});

describe('deleteImage', () => {
  it('calls cloudinary destroy with the given publicId', async () => {
    cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });

    await deleteImage('recording-ternak/dashboard/abc');

    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('recording-ternak/dashboard/abc');
  });

  it('swallows errors instead of throwing', async () => {
    cloudinary.uploader.destroy.mockRejectedValue(new Error('not found'));

    await expect(deleteImage('missing-id')).resolves.toBeUndefined();
  });
});
