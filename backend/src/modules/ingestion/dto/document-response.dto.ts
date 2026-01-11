import { ApiProperty } from '@nestjs/swagger';

export class DocumentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  filePath: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty({ nullable: true })
  title: string | null;

  @ApiProperty()
  contentHash: string;

  @ApiProperty()
  lastModified: Date;

  @ApiProperty()
  indexedAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
