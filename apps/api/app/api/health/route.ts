import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check Supabase connection by running a simple query.
    // Querying the 'user' table which was created in F-00 DB initialization.
    const { error } = await supabase.from('user').select('id').limit(1);

    if (error) {
      console.error('Supabase connection check failed:', error);
      return NextResponse.json(
        {
          status: 'unhealthy',
          services: {
            supabase: 'disconnected',
            error: error.message,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'healthy',
      services: {
        supabase: 'connected',
      },
    });
  } catch (err: unknown) {
    console.error('Health check endpoint error:', err);
    return NextResponse.json(
      {
        status: 'unhealthy',
        services: {
          supabase: 'error',
          error: err instanceof Error ? err.message : String(err),
        },
      },
      { status: 500 }
    );
  }
}
