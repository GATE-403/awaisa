import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from '../config/env.js'

// Local files are served by MediaController under this prefix; the web app reaches it through /api.
const LOCAL_URL_PREFIX = '/api/media/'

const KEY_PATTERN = /^[a-z0-9-]+\/[a-z0-9-]+\.webp$/

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name)
  private readonly s3: S3Client | null

  constructor(private readonly config: ConfigService<Env, true>) {
    const driver = config.get('STORAGE_DRIVER', { infer: true })
    this.s3 =
      driver === 's3'
        ? new S3Client({
            region: config.get('S3_REGION', { infer: true }),
            endpoint: config.get('S3_ENDPOINT', { infer: true }),
            credentials: {
              accessKeyId: config.get('S3_ACCESS_KEY_ID', { infer: true }) ?? '',
              secretAccessKey: config.get('S3_SECRET_ACCESS_KEY', { infer: true }) ?? '',
            },
          })
        : null
    this.logger.log(`Storage driver: ${driver}`)
  }

  /** Saves a processed WebP image and returns its public URL. */
  async put(key: string, body: Buffer) {
    if (this.s3) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.config.get('S3_BUCKET', { infer: true }),
          Key: key,
          Body: body,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      )
      return `${this.config.get('S3_PUBLIC_URL', { infer: true })}/${key}`
    }

    const path = this.localPath(key)
    await mkdir(resolve(path, '..'), { recursive: true })
    await writeFile(path, body)

    return `${LOCAL_URL_PREFIX}${key}`
  }

  /** Best effort: a missing file is not an error, the reference is gone either way. */
  async remove(url: string) {
    const key = this.keyFromUrl(url)
    if (!key) return

    try {
      if (this.s3) {
        await this.s3.send(
          new DeleteObjectCommand({
            Bucket: this.config.get('S3_BUCKET', { infer: true }),
            Key: key,
          }),
        )
      } else {
        await unlink(this.localPath(key))
      }
    } catch (error) {
      this.logger.warn(`Could not delete ${key}: ${String(error)}`)
    }
  }

  async readLocal(key: string) {
    if (!KEY_PATTERN.test(key)) throw new NotFoundException()
    try {
      return await readFile(this.localPath(key))
    } catch {
      throw new NotFoundException()
    }
  }

  private keyFromUrl(url: string) {
    const publicUrl = this.config.get('S3_PUBLIC_URL', { infer: true })
    const key = url.startsWith(LOCAL_URL_PREFIX)
      ? url.slice(LOCAL_URL_PREFIX.length)
      : publicUrl && url.startsWith(`${publicUrl}/`)
        ? url.slice(publicUrl.length + 1)
        : null

    return key && KEY_PATTERN.test(key) ? key : null
  }

  private localPath(key: string) {
    return join(resolve(this.config.get('UPLOAD_DIR', { infer: true })), key)
  }
}
