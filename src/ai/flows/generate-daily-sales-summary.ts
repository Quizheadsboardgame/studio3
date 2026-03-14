'use server';
/**
 * @fileOverview A Genkit flow for generating a daily sales summary.
 *
 * - generateDailySalesSummary - A function that handles the daily sales summary generation process.
 * - GenerateDailySalesSummaryInput - The input type for the generateDailySalesSummary function.
 * - GenerateDailySalesSummaryOutput - The return type for the generateDailySalesSummary function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateDailySalesSummaryInputSchema = z.object({
  date: z.string().describe('The date for which the sales summary is requested (e.g., "YYYY-MM-DD").'),
  dailySales: z.record(
    z.string().describe('Seller name'),
    z.array(
      z.object({
        card: z.string().describe('The name of the card sold.'),
        price: z.number().describe('The selling price of the card.'),
      })
    ).describe('An array of sales for a specific seller.')
  ).describe('A record mapping seller names to their sales for the given date.'),
});
export type GenerateDailySalesSummaryInput = z.infer<typeof GenerateDailySalesSummaryInputSchema>;

const GenerateDailySalesSummaryOutputSchema = z.object({
  summary: z.string().describe('A brief summary of the daily sales activity, including top-selling cards and any emerging trends.'),
});
export type GenerateDailySalesSummaryOutput = z.infer<typeof GenerateDailySalesSummaryOutputSchema>;

export async function generateDailySalesSummary(input: GenerateDailySalesSummaryInput): Promise<GenerateDailySalesSummaryOutput> {
  return generateDailySalesSummaryFlow(input);
}

const generateDailySalesSummaryPrompt = ai.definePrompt({
  name: 'generateDailySalesSummaryPrompt',
  input: { schema: GenerateDailySalesSummaryInputSchema },
  output: { schema: GenerateDailySalesSummaryOutputSchema },
  prompt: `You are a sales analyst for Newton's Collectables. Your task is to analyze the daily sales data for {{date}} and provide a concise summary, highlighting top-selling cards and any emerging trends. The summary should be easy to understand for a sales manager.

Daily Sales Data:
{{#each dailySales as |sellerSales sellerName|}}
Seller: {{sellerName}}
  {{#each sellerSales as |sale|}}
  - Card: {{{sale.card}}}, Price: £{{{sale.price}}}
  {{/each}}
{{/each}}
`,
});

const generateDailySalesSummaryFlow = ai.defineFlow(
  {
    name: 'generateDailySalesSummaryFlow',
    inputSchema: GenerateDailySalesSummaryInputSchema,
    outputSchema: GenerateDailySalesSummaryOutputSchema,
  },
  async (input) => {
    const { output } = await generateDailySalesSummaryPrompt(input);
    return output!;
  }
);
