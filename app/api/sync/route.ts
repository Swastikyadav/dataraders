import { syncAllPlatforms, getSyncStatus } from '@/lib/sync';

export async function POST(request: Request) {
  try {
    const results = await syncAllPlatforms();
    return Response.json(
      {
        success: true,
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const status = await getSyncStatus();
    return Response.json(
      {
        success: true,
        status,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
