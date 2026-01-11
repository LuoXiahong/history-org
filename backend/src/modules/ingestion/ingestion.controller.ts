import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  BadRequestException,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { IndexDocumentDto } from './dto/index-document.dto';
import { DocumentResponseDto } from './dto/document-response.dto';
import { IndexDocumentCommand } from './commands/impl/index-document.command';
import { FileSystemService } from '../../shared/infrastructure/file-system/file-system.service';

@ApiTags('ingestion')
@Controller('ingestion')
export class IngestionController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly fileSystemService: FileSystemService,
  ) {}

  @Post('documents')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Index a markdown document by path' })
  @ApiResponse({
    status: 201,
    description: 'Document successfully indexed',
    type: DocumentResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  async indexDocument(
    @Body() dto: IndexDocumentDto,
  ): Promise<DocumentResponseDto> {
    const command = new IndexDocumentCommand(dto.filePath);
    return await this.commandBus.execute(command);
  }

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload and index a markdown document' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Markdown file to upload',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Document uploaded and indexed successfully',
    type: DocumentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type (only .md files allowed)',
  })
  async uploadDocument(
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ): Promise<DocumentResponseDto> {
    // Validate file extension
    if (!file.originalname.endsWith('.md')) {
      throw new BadRequestException('Only markdown (.md) files are allowed');
    }

    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `uploads/${timestamp}-${sanitizedName}`;

    // Save file to DOCUMENTS_BASE_PATH
    await this.fileSystemService.writeFile(filePath, file.buffer);

    // Trigger indexing
    const command = new IndexDocumentCommand(filePath);
    return await this.commandBus.execute(command);
  }
}
