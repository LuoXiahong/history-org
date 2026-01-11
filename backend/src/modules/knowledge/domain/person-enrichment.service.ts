import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { EnrichedPersonDto } from '../dto/enriched-person.dto';

@Injectable()
export class PersonEnrichmentService {
  private readonly openai: OpenAI;
  private readonly model: string;
  private readonly temperature: number;
  private readonly maxTokens: number;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    // Only throw error in non-test environments
    if (!apiKey && process.env.NODE_ENV !== 'test') {
      throw new Error(
        'OPENAI_API_KEY is not configured. Please set it in your .env file.',
      );
    }

    // Initialize OpenAI only if API key is available
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
    this.model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4';
    this.temperature =
      this.configService.get<number>('OPENAI_TEMPERATURE') || 0.3;
    this.maxTokens =
      this.configService.get<number>('OPENAI_MAX_TOKENS') || 4000;
  }

  async enrichPerson(name: string): Promise<EnrichedPersonDto> {
    // If OpenAI is not initialized (e.g., in tests without API key), return minimal data
    if (!this.openai) {
      return {
        fullName: name,
      };
    }

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = `Enrich the following person's name with biographical information:\n\n${name}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        response_format: { type: 'json_object' },
      });

      const responseContent = completion.choices[0]?.message?.content || '{}';
      return this.parseResponse(responseContent);
    } catch (error) {
      // Log error but return partial/empty data instead of crashing
      console.error(
        `OpenAI API error during person enrichment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Return minimal data with just the name
      return {
        fullName: name,
      };
    }
  }

  private buildSystemPrompt(): string {
    return `You are a historical data enrichment system. Given a person's name, return structured JSON with their biographical information.

Return ONLY valid JSON, no markdown, no explanations. Do not include any text outside the JSON object.

Return a JSON object with this exact structure:
{
  "fullName": "string (required)",
  "firstName": "string (optional, null if unknown)",
  "lastName": "string (optional, null if unknown)",
  "title": "string (optional, null if unknown)",
  "birthDate": "YYYY-MM-DD (optional, null if unknown)",
  "deathDate": "YYYY-MM-DD (optional, null if unknown)",
  "description": "string (optional, brief biography, null if unknown)"
}

If information is not available, use null for optional fields. Always include fullName.`;
  }

  private parseResponse(responseContent: string): EnrichedPersonDto {
    try {
      const parsed = JSON.parse(responseContent);
      return {
        fullName: parsed.fullName || '',
        firstName: parsed.firstName || undefined,
        lastName: parsed.lastName || undefined,
        title: parsed.title || undefined,
        birthDate: parsed.birthDate || undefined,
        deathDate: parsed.deathDate || undefined,
        description: parsed.description || undefined,
      };
    } catch (error) {
      throw new Error(
        `Failed to parse OpenAI response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
