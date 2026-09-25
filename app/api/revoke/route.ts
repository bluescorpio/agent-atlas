import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { readCommerceAllowance } from '../../../lib/erc8183/allowance';
import { revokeCommerceAllowance } from '../../../lib/erc8183/revoke';
import { activateErrorHttpStatus } from '../../../lib/erc8183/agentcore-oauth';
import { ERC8183_COMMERCE, U_TOKEN } from '../../../lib/erc8183/constants';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  const wallet = new URL(request.url).searchParams.get('wallet');
  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json({ error: 'wallet query must be a 0x address' }, { status: 400 });
  }
  try {
    const snapshot = await readCommerceAllowance(wallet);
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ALLOWANCE_READ_FAILED';
    return NextResponse.json({
      error: message,
      token: U_TOKEN,
      spender: ERC8183_COMMERCE,
    }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { wallet?: string };
    if (!body.wallet) {
      return NextResponse.json({
        error: 'WALLET_NOT_CONNECTED',
        nextStep: 'Connect the ERC-8183 buyer wallet, then revoke.',
      }, { status: 400 });
    }
    const result = await revokeCommerceAllowance(body.wallet);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'REVOKE_FAILED';
    return NextResponse.json({
      error: message,
      nextStep: message === 'WALLET_MISMATCH'
        ? 'Connected wallet must equal ERC8183_BUYER_PRIVATE_KEY.'
        : 'Retry POST /api/revoke with the buyer wallet. Spender is the ERC-8183 commerce contract.',
    }, { status: activateErrorHttpStatus(message) });
  }
}
