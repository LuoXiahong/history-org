import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { FileSystemInterface } from './file-system.interface';

@Injectable()
export class FileSystemService implements FileSystemInterface {
  private readonly basePath: string;

  constructor(private readonly configService: ConfigService) {
    this.basePath =
      this.configService.get<string>('DOCUMENTS_BASE_PATH') || './content';
  }

  getBasePath(): string {
    return this.basePath;
  }

  async readFile(filePath: string): Promise<string> {
    const fullPath = join(this.basePath, filePath);
    return await fs.readFile(fullPath, 'utf-8');
  }

  async writeFile(filePath: string, content: Buffer | string): Promise<void> {
    const fullPath = join(this.basePath, filePath);
    await this.ensureDirectory(dirname(fullPath));
    await fs.writeFile(fullPath, content);
  }

  async getFileStats(filePath: string): Promise<{
    size: number;
    mtime: Date;
  }> {
    const fullPath = join(this.basePath, filePath);
    const stats = await fs.stat(fullPath);
    return {
      size: stats.size,
      mtime: stats.mtime,
    };
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const fullPath = join(this.basePath, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Ignore if directory already exists
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }
}
