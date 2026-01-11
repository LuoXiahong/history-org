import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IndexDocumentDto {
  @ApiProperty({
    description: 'Relative path to the markdown file from the base directory',
    example: 'documents/history.md',
  })
  @IsString()
  @IsNotEmpty()
  filePath: string;
}
