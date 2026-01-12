import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface ExtractedPerson {
  fullName: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  birthDate?: string;
  deathDate?: string;
  description?: string;
}

export interface ExtractedEvent {
  title: string;
  description?: string;
  dateStart?: string;
  dateEnd?: string;
  dateType?: string;
  location?: string;
  relatedPersonNames?: string[];
}

export interface ExtractionResult {
  persons: ExtractedPerson[];
  events: ExtractedEvent[];
}

@Injectable()
export class OpenAIExtractorService {
  private readonly openai: OpenAI | undefined;
  private readonly model: string;
  private readonly temperature: number;
  private readonly maxTokens: number;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    // Only throw error in non-test/non-production environments without key
    if (!apiKey && process.env.NODE_ENV !== 'test') {
      console.warn(
        'OPENAI_API_KEY is not configured. Extraction features will be disabled.',
      );
    }

    this.openai = apiKey ? new OpenAI({ apiKey }) : undefined;
    this.model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4';
    this.temperature =
      this.configService.get<number>('OPENAI_TEMPERATURE') || 0.3;
    this.maxTokens =
      this.configService.get<number>('OPENAI_MAX_TOKENS') || 4000;
  }

  async extractEntities(content: string): Promise<ExtractionResult> {
    // If OpenAI is not initialized, return empty result
    if (!this.openai) {
      return { persons: [], events: [] };
    }

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = `Extract historical persons and events from the following text:\n\n${content}`;

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
      if (error instanceof Error) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw new Error('Unknown error occurred during extraction');
    }
  }

  private buildSystemPrompt(): string {
    return `You are a historical data extraction system. Extract historical persons and events from text and return them as structured JSON.

For each person, extract:
- fullName (required): Full name of the person
- firstName (optional): First name
- lastName (optional): Last name
- title (optional): Title or role (e.g., "King", "General", "Philosopher")
- birthDate (optional): Birth date in ISO format (YYYY-MM-DD)
- deathDate (optional): Death date in ISO format (YYYY-MM-DD)
- description (optional): Brief description or biography

For each event, extract:
- title (required): Event title
- description (optional): Event description
- dateStart (optional): Start date in ISO format (YYYY-MM-DD)
- dateEnd (optional): End date in ISO format (YYYY-MM-DD)
- dateType (optional): Type of date ("exact", "approximate", "decade", "century")
- location (optional): Event location
- relatedPersonNames (optional): Array of person full names mentioned in the event

Return a JSON object with this structure:
{
  "persons": [...],
  "events": [...]
}

Be thorough but only extract entities that are clearly historical persons or events.`;
  }

  private parseResponse(responseContent: string): ExtractionResult {
    try {
      const parsed = JSON.parse(responseContent);
      return {
        persons: Array.isArray(parsed.persons) ? parsed.persons : [],
        events: Array.isArray(parsed.events) ? parsed.events : [],
      };
    } catch (error) {
      throw new Error(
        `Failed to parse OpenAI response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
