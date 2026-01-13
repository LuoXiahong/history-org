import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class IndexDocumentDto {
  @ApiProperty({
    description: 'Relative path to the markdown file from the base directory',
    example: 'documents/history.md',
    maxLength: 500,
  })
  @IsString({ message: 'File path must be a string' })
  @IsNotEmpty({ message: 'File path is required' })
  @MaxLength(500, { message: 'File path must not exceed 500 characters' })
  @Transform(({ value }: { value: string }) => value?.trim())
  filePath: string;
}
