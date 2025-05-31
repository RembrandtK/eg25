import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    status: 'Server is running',
    message: 'Debug status endpoint working'
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log to server console with clear formatting
    console.log('\n🔍 CLIENT DEBUG STATUS:', {
      timestamp: new Date().toISOString(),
      ...body
    });
    
    return NextResponse.json({ 
      received: true, 
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Debug status endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to process debug data' }, 
      { status: 500 }
    );
  }
}
