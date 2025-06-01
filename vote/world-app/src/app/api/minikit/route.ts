import { NextRequest, NextResponse } from "next/server";
import { MiniKit } from "@worldcoin/minikit-js";

// Define the response type locally since it's not exported
interface ResponseSuccessPayload {
  status: "success";
  reference: string;
}

export async function POST(request: NextRequest) {
  try {
    const { payload } = await request.json();

    console.log('🔗 MiniKit Action received:', {
      command: payload.command,
      reference: payload.reference,
      timestamp: new Date().toISOString()
    });

    // Send debug info
    await fetch(`${request.nextUrl.origin}/api/debug`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "MiniKit Action Handler",
        data: JSON.stringify({
          command: payload.command,
          reference: payload.reference,
          hasPayload: !!payload
        }, null, 2)
      }),
    }).catch(() => {});

    // Handle send-transaction command for the 'vote' action
    if (payload.command === "send-transaction" || payload.action === "vote") {
      console.log('🗳️ Processing vote action send-transaction');

      // For peer ranking transactions, we acknowledge and allow the transaction
      const response: ResponseSuccessPayload = {
        status: "success",
        reference: payload.reference,
      };

      console.log('✅ Vote action send-transaction acknowledged:', response);

      // Send debug info about the response
      await fetch(`${request.nextUrl.origin}/api/debug`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "MiniKit Vote Action Response",
          data: JSON.stringify({
            action: "vote",
            command: payload.command,
            reference: payload.reference,
            response
          }, null, 2)
        }),
      }).catch(() => {});

      return NextResponse.json(response);
    }

    // Handle other commands
    console.log('❓ Unknown command:', payload.command);

    return NextResponse.json({
      status: "error",
      error_code: "unknown_command",
      error_message: `Unknown command: ${payload.command}`,
    });

  } catch (error) {
    console.error('❌ MiniKit Action error:', error);

    // Send debug info about the error
    await fetch(`${request.nextUrl.origin}/api/debug`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "MiniKit Action Error",
        data: JSON.stringify({
          error: error instanceof Error ? error.message : String(error)
        }, null, 2)
      }),
    }).catch(() => {});

    return NextResponse.json({
      status: "error",
      error_code: "internal_error",
      error_message: "Internal server error",
    });
  }
}
