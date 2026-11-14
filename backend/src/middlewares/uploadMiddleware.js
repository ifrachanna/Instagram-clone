import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

// Define maximum file limits
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

// Configure Cloudinary Storage engine
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isVideo = file.mimetype.startsWith('video/');

    return {
      folder: isVideo ? 'instagram_clone/videos' : 'instagram_clone/images',
      resource_type: isVideo ? 'video' : 'image',
      allowed_formats: isVideo
        ? ['mp4', 'mov', 'avi', 'mkv', 'webm']
        : ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      public_id: `${Date.now()}-${file.originalname.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_')}`,
    };
  },
});

// File format filter
const fileFilter = (req, file, cb) => {
  const isImage = file.mimetype.startsWith('image/');
  const isVideo = file.mimetype.startsWith('video/');

  if (isImage || isVideo) {
    cb(null, true);
  } else {
    cb(
      new Error('Unsupported file format. Only images (JPG, PNG, WEBP) and videos (MP4, MOV, WEBM) are allowed.'),
      false
    );
  }
};

// Base Multer instance (50MB ceiling)
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_VIDEO_SIZE, // Global max ceiling (videos up to 50MB)
  },
});

/**
 * Middleware to enforce strict 10MB size limit for images and 50MB for videos
 */
export const validateMediaSize = (req, res, next) => {
  const files = req.files || (req.file ? [req.file] : []);

  for (const file of files) {
    const isImage = file.mimetype && file.mimetype.startsWith('image/');
    if (isImage && file.size > MAX_IMAGE_SIZE) {
      return res.status(400).json({
        status: 'error',
        message: `Image ${file.originalname} exceeds the 10MB limit.`,
      });
    }
  }

  next();
};

/**
 * Upload single media file (e.g. avatar or single post)
 */
export const uploadSingleMedia = (fieldName = 'media') => {
  return [upload.single(fieldName), validateMediaSize];
};

/**
 * Upload multiple media items (e.g. carousel posts up to 10 files)
 */
export const uploadPostMedia = (fieldName = 'media', maxCount = 10) => {
  return [upload.array(fieldName, maxCount), validateMediaSize];
};

export default upload;
