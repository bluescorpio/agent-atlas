import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isHistoryPrunedError } from './logs';

test('detects PublicNode pruned-history errors', () => {
  assert.equal(
    isHistoryPrunedError(new Error('History has been pruned for this block. To remove restrictions, order a dedicated full node')),
    true,
  );
  assert.equal(isHistoryPrunedError(new Error('RPC Request failed')), false);
});
