import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

import { ApiError } from '../utils/apiError.util';

let s3Client: S3Client | null = null;

const getS3Client = (): S3Client => {
  if (s3Client) return s3Client;

  const bucketName = process.env.S3_BUCKET_NAME;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!bucketName || !accessKeyId || !secretAccessKey) {
    throw new ApiError(503, 'Storage configuration is missing.');
  }

  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  });

  return s3Client;
};

export const isStorageConfigured = (): boolean => {
  const bucketName = process.env.S3_BUCKET_NAME;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  return !!(bucketName && accessKeyId && secretAccessKey);
};

export const generateUploadUrl = async (
  filename: string,
  mimeType: string,
  fileSize: number,
): Promise<{ uploadUrl: string; fileKey: string }> => {
  const parsedSize = Math.floor(fileSize);
  if (isNaN(parsedSize) || parsedSize <= 0) {
    throw new ApiError(400, 'File size must be a positive integer.');
  }

  const client = getS3Client();
  const bucketName = process.env.S3_BUCKET_NAME!;

  const cleanName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileKey = `nexTask_attachments/${randomUUID()}-${cleanName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
    ContentType: mimeType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });

  return { uploadUrl, fileKey };
};

export const generateDownloadUrl = async (fileKey: string): Promise<string | null> => {
  if (!isStorageConfigured()) {
    return null;
  }

  try {
    const client = getS3Client();
    const bucketName = process.env.S3_BUCKET_NAME!;

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    });

    return await getSignedUrl(client, command, { expiresIn: 900 });
  } catch (error) {
    console.error(`Failed to generate download URL for key ${fileKey}:`, error);
    return null;
  }
};

export const deleteFile = async (fileKey: string): Promise<void> => {
  if (!isStorageConfigured()) {
    return;
  }

  try {
    const client = getS3Client();
    const bucketName = process.env.S3_BUCKET_NAME!;

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    });

    await client.send(command);
  } catch (error) {
    console.error(`Failed to delete file from S3 for key ${fileKey}:`, error);
    throw new ApiError(502, 'Failed to delete file from storage.');
  }
};
