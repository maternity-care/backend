import 'reflect-metadata';
import { config } from 'dotenv';
import {
  GetBucketPolicyCommand,
  ListObjectsV2Command,
  PutBucketAclCommand,
  PutBucketPolicyCommand,
  PutObjectAclCommand,
  S3Client,
} from '@aws-sdk/client-s3';

config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function main() {
  const bucket = requireEnv('S3_BUCKET');
  const client = new S3Client({
    region: process.env.S3_REGION ?? 'ap-southeast-1',
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true' || Boolean(process.env.S3_ENDPOINT),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY ?? '',
    },
  });

  const publicReadStatement = {
    Sid: 'MaternityCarePublicReadObjects',
    Effect: 'Allow',
    Principal: '*',
    Action: ['s3:GetObject'],
    Resource: [`arn:aws:s3:::${bucket}/*`],
  };

  let statements: unknown[] = [];

  try {
    const current = await client.send(new GetBucketPolicyCommand({ Bucket: bucket }));
    const parsed = current.Policy ? JSON.parse(current.Policy) : undefined;
    statements = Array.isArray(parsed?.Statement) ? parsed.Statement : [];
  } catch {
    statements = [];
  }

  const nextStatements = [
    ...statements.filter(
      (statement) =>
        !(
          statement &&
          typeof statement === 'object' &&
          'Sid' in statement &&
          statement.Sid === publicReadStatement.Sid
        ),
    ),
    publicReadStatement,
  ];

  const policy = {
    Version: '2012-10-17',
    Statement: nextStatements,
  };

  await client.send(
    new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: JSON.stringify(policy),
    }),
  );

  try {
    await client.send(
      new PutBucketAclCommand({
        Bucket: bucket,
        ACL: 'public-read',
      }),
    );
  } catch (error) {
    console.warn(
      `Could not set bucket ACL public-read: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  let continuationToken: string | undefined;
  let updatedObjects = 0;

  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
      }),
    );

    for (const object of page.Contents ?? []) {
      if (!object.Key) continue;
      await client.send(
        new PutObjectAclCommand({
          Bucket: bucket,
          Key: object.Key,
          ACL: 'public-read',
        }),
      );
      updatedObjects += 1;
    }

    continuationToken = page.NextContinuationToken;
  } while (continuationToken);

  console.log(
    `Bucket "${bucket}" is configured for public object read. Updated ${updatedObjects} existing object ACL(s).`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
