import dotenv from 'dotenv';
import { CloudFrontRequestEvent } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import * as fs from 'fs';

import { handler } from './src/index';

dotenv.config();

const { AWS_CLOUDFRONT_DOMAIN, AWS_CLOUDFRONT_ID } = process.env;

if (!AWS_CLOUDFRONT_DOMAIN || !AWS_CLOUDFRONT_ID) {
  throw new Error('AWS_CLOUDFRONT_DOMAIN, AWS_CLOUDFRONT_ID are required');
}

const createRandomIp = () => {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join('.');
};

const requestId = uuidv4().replaceAll('-', '');

const mockEvent: CloudFrontRequestEvent = {
  Records: [
    {
      cf: {
        config: {
          distributionDomainName: new URL(AWS_CLOUDFRONT_DOMAIN || '').hostname,
          distributionId: AWS_CLOUDFRONT_ID,
          eventType: 'origin-request',
          requestId,
        },
        request: {
          clientIp: createRandomIp(),
          method: 'GET',
          uri: '/assets/logos/deep-step-dark-logo.png',
          querystring: 'width=800&height=600',
          headers: {
            host: [{ key: 'Host', value: new URL(AWS_CLOUDFRONT_DOMAIN || '').hostname }],
            'user-agent': [
              {
                key: 'User-Agent',
                value:
                  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
              },
            ],
          },
        },
      },
    },
  ],
};

const runTest = async () => {
  try {
    console.log(`uri : ${mockEvent.Records[0].cf.request.uri}`);
    console.log(`query: ${mockEvent.Records[0].cf.request.querystring}`);

    const result = await handler(mockEvent);

    console.log(`response status : ${result.status}`);
    console.log(`response headers : ${result.headers}`);

    if (result.status === '200') {
      console.log('resizing success');

      const buffer = Buffer.from(result.body, 'base64');
      const fileName = `test-${Date.now()}.webp`;
      const filePath = path.join(__dirname, fileName);

      fs.writeFileSync(filePath, buffer);
    } else {
      console.log('resizing fail');
    }
  } catch (e) {
    console.error(e);
  }
};

runTest();
