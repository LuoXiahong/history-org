export interface FileSystemInterface {
  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, content: Buffer | string): Promise<void>;
  getFileStats(filePath: string): Promise<{
    size: number;
    mtime: Date;
  }>;
  exists(filePath: string): Promise<boolean>;
  ensureDirectory(dirPath: string): Promise<void>;
}
