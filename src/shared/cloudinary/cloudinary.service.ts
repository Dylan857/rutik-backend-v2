import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('cloudinary.cloudName'),
      api_key: this.configService.get<string>('cloudinary.apiKey'),
      api_secret: this.configService.get<string>('cloudinary.apiSecret'),
    });
  }

  /** Uploads a receipt photo and returns its secure (https) URL. */
  async uploadReceipt(file: Express.Multer.File): Promise<string> {
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { folder: 'rutik/payment-receipts', resource_type: 'image' },
        (error: UploadApiErrorResponse | undefined, result?: UploadApiResponse) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary upload returned no result'));
            return;
          }
          resolve(result);
        },
      );
      upload.end(file.buffer);
    }).catch((error) => {
      throw new InternalServerErrorException(
        `Failed to upload receipt: ${(error as Error).message}`,
      );
    });

    return result.secure_url;
  }
}
