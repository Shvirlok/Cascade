import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import dotenv from 'dotenv';

dotenv.config();

export const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
export const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || process.env.AWS_BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620-v1:0';
export const EMBEDDING_MODEL_ID = process.env.AWS_EMBEDDING_MODEL_ID || 'amazon.titan-embed-text-v2:0';

export const bedrockClient = new BedrockRuntimeClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock',
  },
});

export function hasValidAwsCredentials(): boolean {
  const key = process.env.AWS_ACCESS_KEY_ID;
  const secret = process.env.AWS_SECRET_ACCESS_KEY;
  return Boolean(key && key !== 'mock' && key !== 'mock-key' && secret && secret !== 'mock' && secret !== 'mock-secret');
}
