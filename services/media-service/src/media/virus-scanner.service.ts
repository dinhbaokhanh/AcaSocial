import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createConnection } from 'node:net';

/** ClamD INSTREAM: no file reaches the CDN before an explicit OK response. */
@Injectable()
export class VirusScannerService {
  constructor(private readonly config: ConfigService) {}

  async scan(buffer: Buffer): Promise<void> {
    const host = this.config.get<string>('CLAMAV_HOST', 'localhost');
    const port = Number(this.config.get('CLAMAV_PORT', 3310));
    const timeout = Number(this.config.get('CLAMAV_TIMEOUT_MS', 20000));
    const result = await new Promise<string>((resolve, reject) => {
      const socket = createConnection({ host, port });
      let response = '';
      let finished = false;
      const finish = (error?: Error) => {
        if (finished) return;
        finished = true;
        clearTimeout(deadline);
        socket.destroy();
        if (error) reject(error);
        else resolve(response.replace(/\0.*$/s, '').trim());
      };
      const deadline = setTimeout(
        () => finish(new Error('Scan timeout')),
        timeout,
      );
      socket.on('error', (error) => finish(error));
      socket.on('end', () => finish(new Error('Incomplete scan response')));
      socket.on('data', (chunk) => {
        response += chunk.toString('utf8');
        if (response.length > 4096)
          return finish(new Error('Invalid scan response'));
        if (response.includes('\0')) finish();
      });
      socket.on('connect', () => {
        socket.write('zINSTREAM\0');
        for (let offset = 0; offset < buffer.length; offset += 65536) {
          const chunk = buffer.subarray(offset, offset + 65536);
          const size = Buffer.alloc(4);
          size.writeUInt32BE(chunk.length);
          socket.write(size);
          socket.write(chunk);
        }
        socket.write(Buffer.alloc(4));
      });
    }).catch(() => {
      throw new ServiceUnavailableException(
        'Không thể quét virus. File chưa được tải lên; vui lòng thử lại.',
      );
    });
    if (result.endsWith(' FOUND'))
      throw new BadRequestException(
        'File bị chặn do phát hiện mối đe dọa. Hãy gỡ hoặc thay file.',
      );
    if (result !== 'stream: OK')
      throw new ServiceUnavailableException(
        'Không kiểm tra được file. File chưa được tải lên; vui lòng thử lại.',
      );
  }
}
