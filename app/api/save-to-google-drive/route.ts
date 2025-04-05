import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { savePlanToGoogleDrive } from '@/app/utils/googleDriveService';

export async function POST(request: NextRequest) {
  try {
    // Get session and token
    const token = await getToken({ req: request });

    // Check if user is authenticated
    if (!token || !token.sub) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    // Parse the request body to get plan data
    const data = await request.json();
    
    if (!data.plan) {
      return NextResponse.json({ 
        success: false, 
        error: 'No plan data provided' 
      }, { status: 400 });
    }

    // Get access token for Google Drive API
    const accessToken = token.accessToken as string;
    
    if (!accessToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'Google Drive access not available' 
      }, { status: 403 });
    }

    // Save the plan to Google Drive
    const fileName = `milestone-ai-plan-${token.sub}.json`;
    const result = await savePlanToGoogleDrive(accessToken, data.plan, fileName);

    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: result.error || 'Failed to save plan to Google Drive' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      fileId: result.fileId,
      message: 'Plan saved to Google Drive successfully'
    });
  } catch (error: any) {
    console.error('Error saving plan to Google Drive:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Server error while saving plan'
    }, { status: 500 });
  }
} 