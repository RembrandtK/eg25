import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  MiniAppWalletAuthSuccessPayload,
  verifySiweMessage,
} from "@worldcoin/minikit-js";

// Store verified messages temporarily (in production, use Redis or database)
const verifiedMessages = new Map<string, {
  payload: MiniAppWalletAuthSuccessPayload;
  timestamp: number;
  isValid: boolean;
}>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of verifiedMessages.entries()) {
    if (now - value.timestamp > 5 * 60 * 1000) { // 5 minutes
      verifiedMessages.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface IRequestPayload {
  payload: MiniAppWalletAuthSuccessPayload;
  nonce: string;
}

export async function POST(req: NextRequest) {
  const { payload, nonce } = (await req.json()) as IRequestPayload;

  const cookieStore = await cookies();
  if (nonce !== cookieStore.get("siwe")?.value) {
    return NextResponse.json({
      status: "error",
      isValid: false,
      message: "Invalid nonce",
    });
  }

  try {
    const validMessage = await verifySiweMessage(payload, nonce);

    // Store the verification result for NextAuth to use
    const verificationKey = `${payload.address}_${nonce}`;
    verifiedMessages.set(verificationKey, {
      payload,
      timestamp: Date.now(),
      isValid: validMessage.isValid,
    });

    console.log('🔐 SIWE verification completed:', {
      address: payload.address,
      nonce,
      isValid: validMessage.isValid,
      verificationKey,
    });

    return NextResponse.json({
      status: "success",
      isValid: validMessage.isValid,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error('❌ SIWE verification failed:', errorMessage);
    return NextResponse.json({
      status: "error",
      isValid: false,
      message: errorMessage,
    });
  }
}

// Export function to check if a message was already verified
export function getVerifiedMessage(address: string, nonce: string) {
  const verificationKey = `${address}_${nonce}`;
  const verified = verifiedMessages.get(verificationKey);

  if (verified && Date.now() - verified.timestamp < 5 * 60 * 1000) {
    // Remove after use to prevent replay attacks
    verifiedMessages.delete(verificationKey);
    return verified;
  }

  return null;
}
