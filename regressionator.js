import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

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
        const sampleTestCases = [
            {
                "id": "1",
                "testName": "Run Automatic End of Draw for Daily Winners Daily Giveaway",
                "steps": "1. Run the following commands including the draw number updated in the setup steps\n2. In admin, navigate to the Lottery -> Daily Winners -> Giveaways\n3. Click on today’s daily giveaway in the calendar and click the Draw winner button. The page will be populated with the selected winner with the 1st approved and published labels\n4. Navigate to the customer profile page for the winning customer. A new event will be added for fulfilling the membership prize\n5. Navigate to the transaction list for the customer. A record for the deposit of the winning prize amount will be listed\n6. Login to the web for the winning customer. The customer balance will include the daily winners prize of $500 included in their withdrawable prize funds"
            },
            {
                "id": "2",
                "testName": "Process Manual End of Draw for Daily Winners Giveaway With One Winner",
                "steps": "1. In admin, navigate to the Lottery -> Daily Winners -> Giveaways\n2. Click the button on the modal to confirm publishing this winner. The value of the status column will be updated to published and the link in the Actions column will be updated to Fulfil prize\n3. Navigate to the winning customer profile page. A new event will be added for fulfilling the membership prize\n4. Login to the web with the winning customer. The payout amount will be added to the customer’s account balance and included in their withdrawable prize funds"
            },
            {
                "id": "3",
                "testName": "Cancel a Daily Winners Giveaway Draw",
                "steps": "1. In admin, navigate to the Lottery -> Daily Winners -> Giveaways\n2. Click on today’s giveaway and select Cancel draw\n3. Confirm the cancellation in the modal dialog\n4. Verify the draw status is updated to Canceled\n5. Navigate to customer records and ensure no prize was allocated"
            },
            {
                "id": "4",
                "testName": "Re-run Draw After Cancellation",
                "steps": "1. In admin, navigate to the Lottery -> Daily Winners -> Giveaways\n2. Click on the previously canceled draw and click Re-run Draw\n3. Verify a new winner is selected and labeled as approved and published\n4. Navigate to the customer profile and confirm prize fulfillment event\n5. Check the customer’s transaction list for prize deposit"
            },
            {
                "id": "5",
                "testName": "Validate Winner is Excluded From Future Draws",
                "steps": "1. Run a daily draw where a customer wins\n2. Confirm customer is marked as a winner in the database\n3. Schedule and run the next daily draw\n4. Verify that the previous winner is excluded from the candidate list\n5. Ensure a new winner is selected"
            },
            {
                "id": "6",
                "testName": "Payout Failure Handling",
                "steps": "1. Simulate a payout failure by forcing an error in the payment system\n2. Run a daily draw and select a winner\n3. Attempt to process the prize payout\n4. Verify an error is logged and admin is notified\n5. Ensure the transaction is not posted to the customer account"
            },
            {
                "id": "7",
                "testName": "Multiple Winners Daily Giveaway",
                "steps": "1. In admin, configure the giveaway to allow 3 winners\n2. Run the draw and verify that 3 unique winners are selected\n3. Each winner should have the approved and published status\n4. Check each customer’s profile for the prize fulfillment event\n5. Confirm the prize amount is deposited for each winner"
            },
            {
                "id": "8",
                "testName": "Verify Draw History and Audit Trail",
                "steps": "1. Run a series of daily draws for 5 consecutive days\n2. In admin, navigate to Lottery -> Daily Winners -> History\n3. Verify each draw is logged with date, winner(s), and prize details\n4. Check the audit trail for draw events and confirm admin actions are recorded"
            },
            {
                "id": "9",
                "testName": "Ensure Eligibility Criteria Are Enforced",
                "steps": "1. Set a customer’s status to ineligible (e.g., due to KYC failure)\n2. Run the daily draw\n3. Verify that the ineligible customer is not selected as a winner\n4. Review logs or draw report to confirm candidate filtering"
            },
            {
                "id": "10",
                "testName": "Manual Fulfillment of Missed Prize",
                "steps": "1. Identify a customer whose prize payout failed due to technical issues\n2. In admin, navigate to the Lottery -> Prize Fulfillment\n3. Manually trigger the Fulfil prize action for the customer\n4. Confirm transaction is created and balance is updated\n5. Verify the customer’s prize status is set to fulfilled"
            }
        ];

        const sampleCodeChanges = {
            text: 'Enhance daily giveaway draw process to support multiple winners and prize fulfillment tracking. UI - Add ability to configure number of winners per giveaway. Backend - Ensure prize fulfillment events and payout transactions are created for each winner.',
            changes: `pkg/rewards/giveaway/draw_execution.go
-45 +132
M

pkg/rewards/giveaway/draw_config.go
-12 +48
M

pkg/rewards/giveaway/draw_winner_selector.go
-33 +87
M

pkg/rewards/giveaway/models/giveaway_winner.go
-0 +22
A

pkg/rewards/giveaway/prize_fulfillment.go
-10 +39
M

pkg/rewards/giveaway/testing/multi_winner_draw_config.json
-0 +150
A

pkg/rewards/giveaway/testing/draw_execution_integration_test.go
-4 +60
M

pkg/web/admin/giveaway_draw_ui.tsx
-21 +78
M

pkg/web/admin/testing/ui_multi_winner_draw.json
-0 +105
A`
        };

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