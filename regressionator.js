import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { readFile } from 'fs/promises';

// Load environment variables from .env file
dotenv.config();

// Check if API key is available
if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in .env file');
}

async function analyzeRegressionTests(testCases, codeChanges) {
    try {
        const { object } = await generateObject({
            model: openai('gpt-4o'),
            schema: z.object({
                toRun: z.array(z.object({
                    testId: z.number(),
                    testName: z.string(),
                    reason: z.string()
                })),
                notToRun: z.array(z.object({
                    testId: z.number(),
                    testName: z.string(),
                    reason: z.string()
                }))
            }),
            prompt: `Analyze the following test cases and code changes to determine which regression tests should be run:
            
            Test Cases: 
            ${JSON.stringify(testCases, null, 2)}
            
            Code Changes: 
            ${JSON.stringify(codeChanges, null, 2)}
            
            Based on the code changes, determine which tests are likely to be affected and should be run, 
            and which tests are unlikely to be affected and can be skipped. Provide clear reasoning for each decision.`,
        });

        return object;
    } catch (error) {
        console.error('Error analyzing regression tests:', error);
        throw error;
    }
}

// Example usage
async function main() {
    try {
        // Load sample data from JSON files
        const sampleTestCases = JSON.parse(
            await readFile(new URL('./sampleTestCases.json', import.meta.url))
        );
        const sampleCodeChanges = JSON.parse(
            await readFile(new URL('./sampleCodeChangesLogin.json', import.meta.url))
        );

        const analysis = await analyzeRegressionTests(sampleTestCases, sampleCodeChanges);
        console.log('Regression Test Analysis:');
        console.log(JSON.stringify(analysis, null, 2));
    } catch (error) {
        console.error('Failed to analyze regression tests:', error);
    }
}

// Only run if this file is being run directly
if (fileURLToPath(import.meta.url) === process.argv[1]) {
    main();
}

export default analyzeRegressionTests; 