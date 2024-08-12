import { CloudFrontRequestEvent } from 'aws-lambda';
import { S3 } from 'aws-sdk';
import sharp from 'sharp';
import dotenv from 'dotenv';

dotenv.config();

const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET } = process.env;

if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION || !AWS_S3_BUCKET) {
  throw new Error('AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET are required');
}

const s3 = new S3({ accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY, region: AWS_REGION });

interface IParam {
  width: number;
  height: number;
}

const resize = async (buffer: Buffer, { width, height }: IParam) => {
  return sharp(buffer).resize(width, height).rotate().webp().toBuffer();
};

const findImage = async (key: string) => {
  const { Body } = await s3.getObject({ Bucket: AWS_S3_BUCKET, Key: key }).promise();

  if (Body instanceof Buffer) {
    return Body;
  }

  throw new Error('s3 object is not buffer');
};

export const handler = async (e: CloudFrontRequestEvent) => {
  const { request } = e.Records[0].cf;
  const params = new URLSearchParams(request.querystring);

  const uri = request.uri;
  const width = parseInt(params.get('width') || '200');
  const height = parseInt(params.get('height') || '200');

  try {
    const buffer = await findImage(uri.substring(1));

    const resizedBuffer = await resize(buffer, { width, height });

    return {
      status: '200',
      body: resizedBuffer.toString('base64'),
      bodyEncoding: 'base64',
      headers: { 'content-type': [{ key: 'Content-Type', value: 'image/webp' }] },
    };
  } catch (e) {
    console.error(e);

    return { status: '500', body: 'Internal Server Error' };
  }
};
