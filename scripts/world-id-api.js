#!/usr/bin/env node

/**
 * World ID Developer Portal API Integration
 * 
 * This module provides functions to interact with the World ID Developer Portal API
 * for automatic action registration when elections are created.
 */

const axios = require('axios');

const WORLD_ID_API_BASE = 'https://developer.worldcoin.org';
const WORLD_ID_APP_ID = 'app_10719845a0977ef63ebe8eb9edb890ad';

/**
 * Check if an action exists in the World ID app
 * @param {string} actionId - The action identifier to check
 * @returns {Promise<boolean>} - True if action exists
 */
async function checkActionExists(actionId) {
  try {
    const response = await axios.post(`${WORLD_ID_API_BASE}/api/v1/precheck/${WORLD_ID_APP_ID}`, {
      action: actionId,
      nullifier_hash: ""
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ElectionManager/1.0'
      }
    });

    return response.status === 200 && response.data.action?.status === 'active';
  } catch (error) {
    if (error.response?.status === 404) {
      return false; // Action doesn't exist
    }
    console.error('Error checking action:', error.message);
    return false;
  }
}

/**
 * Attempt to create an action via GraphQL API (requires API key)
 * @param {string} actionId - The action identifier
 * @param {string} actionName - Human-readable action name
 * @param {string} description - Action description
 * @param {string} apiKey - World ID API key (optional)
 * @returns {Promise<boolean>} - True if successful
 */
async function createActionViaAPI(actionId, actionName, description, apiKey) {
  if (!apiKey) {
    console.log('⚠️  No API key provided - skipping automatic action creation');
    return false;
  }

  try {
    // This is a hypothetical GraphQL mutation - the actual schema may differ
    const mutation = `
      mutation CreateAction($appId: String!, $actionId: String!, $name: String!, $description: String!) {
        createAction(input: {
          appId: $appId,
          actionId: $actionId,
          name: $name,
          description: $description,
          maxVerifications: 1
        }) {
          id
          actionId
          status
        }
      }
    `;

    const response = await axios.post(`${WORLD_ID_API_BASE}/v1/graphql`, {
      query: mutation,
      variables: {
        appId: WORLD_ID_APP_ID,
        actionId: actionId,
        name: actionName,
        description: description
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'ElectionManager/1.0'
      }
    });

    if (response.data.errors) {
      console.error('GraphQL errors:', response.data.errors);
      return false;
    }

    console.log('✅ Action created successfully via API');
    return true;
  } catch (error) {
    console.error('❌ Failed to create action via API:', error.message);
    return false;
  }
}

/**
 * Register an action for an election
 * @param {string} actionId - The action identifier
 * @param {string} electionTitle - Election title for action name
 * @param {string} electionDescription - Election description
 * @param {string} apiKey - Optional API key for automatic creation
 * @returns {Promise<{success: boolean, manual: boolean}>}
 */
async function registerElectionAction(actionId, electionTitle, electionDescription, apiKey = null) {
  console.log(`🔍 Checking if action '${actionId}' exists...`);
  
  // Check if action already exists
  const exists = await checkActionExists(actionId);
  if (exists) {
    console.log('✅ Action already exists and is active');
    return { success: true, manual: false };
  }

  console.log('❌ Action does not exist, attempting to create...');

  // Try to create via API
  const apiSuccess = await createActionViaAPI(
    actionId,
    `Vote: ${electionTitle}`,
    `World ID verification for voting in: ${electionDescription}`,
    apiKey
  );

  if (apiSuccess) {
    return { success: true, manual: false };
  }

  // Fall back to manual instructions
  console.log('\n📋 MANUAL ACTION REGISTRATION REQUIRED');
  console.log('=====================================');
  console.log(`🌐 Go to: https://developer.worldcoin.org/`);
  console.log(`📱 App ID: ${WORLD_ID_APP_ID}`);
  console.log(`🎯 Action ID: ${actionId}`);
  console.log(`📝 Action Name: Vote: ${electionTitle}`);
  console.log(`📄 Description: World ID verification for voting in: ${electionDescription}`);
  console.log(`🔢 Max Verifications: 1 (one vote per person)`);
  console.log('=====================================\n');

  return { success: false, manual: true };
}

/**
 * Batch register multiple actions
 * @param {Array} elections - Array of election objects with actionId, title, description
 * @param {string} apiKey - Optional API key
 */
async function batchRegisterActions(elections, apiKey = null) {
  console.log(`🚀 Batch registering ${elections.length} actions...`);
  
  const results = [];
  for (const election of elections) {
    const result = await registerElectionAction(
      election.actionId,
      election.title,
      election.description,
      apiKey
    );
    results.push({ ...election, ...result });
  }

  // Summary
  const successful = results.filter(r => r.success).length;
  const manual = results.filter(r => r.manual).length;
  
  console.log('\n📊 BATCH REGISTRATION SUMMARY');
  console.log('============================');
  console.log(`✅ Successful: ${successful}/${elections.length}`);
  console.log(`📋 Manual required: ${manual}/${elections.length}`);
  
  if (manual > 0) {
    console.log('\n⚠️  Some actions require manual registration in the Developer Portal');
  }

  return results;
}

module.exports = {
  checkActionExists,
  createActionViaAPI,
  registerElectionAction,
  batchRegisterActions,
  WORLD_ID_APP_ID,
  WORLD_ID_API_BASE
};

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.log('Usage: node world-id-api.js <actionId> <title> <description> [apiKey]');
    process.exit(1);
  }

  const [actionId, title, description, apiKey] = args;
  registerElectionAction(actionId, title, description, apiKey)
    .then(result => {
      console.log('Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}
