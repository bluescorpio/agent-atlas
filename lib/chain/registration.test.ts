import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  a2aEndpointFromRegistration,
  categoryFromRegistration,
  decodeAgentUri,
} from './registration';

test('decodeAgentUri reads data:application/json;base64 registration files', () => {
  const json = {
    name: 'studio-agent',
    description: 'bnbagent-studio agent',
    category: 'grid_trading',
    protocols: ['PancakeSwap'],
    services: [{
      name: 'A2A',
      endpoint: 'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn:aws:bedrock-agentcore:us-east-1:1:runtime/gridbnbusdt-bohsdVE5Pv/invocations?qualifier=DEFAULT',
    }],
  };
  const uri = `data:application/json;base64,${Buffer.from(JSON.stringify(json)).toString('base64')}`;
  const file = decodeAgentUri(uri);
  assert.equal(file?.name, 'studio-agent');
  assert.equal(file?.category, 'grid_trading');
  assert.equal(categoryFromRegistration(file).category, 'grid_trading');
  assert.equal(categoryFromRegistration(file).source, 'registration_json');
});

test('category falls back to AgentCore runtime id when JSON has no category', () => {
  const file = {
    name: 'studio-agent',
    services: [{
      endpoint: 'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A850122838544%3Aruntime%2Fhfguardvenus-sG614z4iLZ/invocations?qualifier=DEFAULT',
    }],
  };
  const classified = categoryFromRegistration(file, a2aEndpointFromRegistration(file));
  assert.equal(classified.category, 'health_factor');
  assert.equal(classified.source, 'runtime_id');
});

test('missing category and runtime marker is Unclassified', () => {
  const classified = categoryFromRegistration({ name: 'other', description: 'no tags' });
  assert.equal(classified.category, 'unclassified');
  assert.equal(classified.source, 'unclassified');
});
