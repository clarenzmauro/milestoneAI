// Google Drive Service Utility
// This service handles interactions with Google Drive API

const GOOGLE_DRIVE_API_URL = 'https://www.googleapis.com/drive/v3';
const GOOGLE_DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3';

/**
 * Save a plan to Google Drive
 * @param accessToken Google OAuth access token
 * @param plan The plan data to save
 * @param fileName Name of the file in Google Drive
 * @returns Object with success status and file info or error
 */
export const savePlanToGoogleDrive = async (
  accessToken: string,
  plan: any,
  fileName: string = 'milestone-ai-plan.json'
): Promise<{ success: boolean; fileId?: string; error?: string }> => {
  try {
    if (!accessToken) {
      return { success: false, error: 'No access token provided' };
    }

    console.log('Attempting to save plan to Google Drive with token...', accessToken.substring(0, 10) + '...');

    // Check if file already exists to update it instead of creating a new one
    const existingFile = await findPlanFile(accessToken, fileName);
    
    if (existingFile) {
      console.log('Found existing file, updating...', existingFile.id);
      // Update existing file
      return await updatePlanFile(accessToken, existingFile.id, plan);
    } else {
      console.log('No existing file found, creating new file...');
      // Create new file
      return await createPlanFile(accessToken, plan, fileName);
    }
  } catch (error: any) {
    console.error('Error saving plan to Google Drive:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to save plan to Google Drive' 
    };
  }
};

/**
 * Find an existing plan file in Google Drive
 */
const findPlanFile = async (
  accessToken: string,
  fileName: string
): Promise<{ id: string } | null> => {
  try {
    console.log('Searching for existing file:', fileName);
    const response = await fetch(
      `${GOOGLE_DRIVE_API_URL}/files?q=name='${fileName}'&spaces=drive&fields=files(id,name)`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Search API response error:', response.status, errorText);
      throw new Error(`Failed to search for file: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Search results:', data);
    
    if (data.files && data.files.length > 0) {
      return { id: data.files[0].id };
    }
    
    return null;
  } catch (error) {
    console.error('Error finding plan file:', error);
    return null;
  }
};

/**
 * Create a new plan file in Google Drive
 */
const createPlanFile = async (
  accessToken: string,
  plan: any,
  fileName: string
): Promise<{ success: boolean; fileId?: string; error?: string }> => {
  try {
    console.log('Creating new file in Google Drive:', fileName);
    // First, create file metadata
    const metadata = {
      name: fileName,
      mimeType: 'application/json'
    };

    // Create multipart request
    const boundary = 'milestone_ai_boundary';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    // Prepare the multipart request body
    const planContent = JSON.stringify(plan);
    
    const body =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      planContent +
      closeDelimiter;

    console.log('Sending request to create file...');
    // Send request to create the file
    const response = await fetch(
      `${GOOGLE_DRIVE_UPLOAD_URL}/files?uploadType=multipart`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': String(body.length)
        },
        body
      }
    );

    // Improved error handling - log the actual response from Google
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API response error:', response.status, errorText);
      
      // Special handling for 403 Forbidden errors
      if (response.status === 403) {
        return { 
          success: false, 
          error: `Google Drive permissions error (403 Forbidden). Your app may need additional permissions or the token may have expired. Details: ${errorText}` 
        };
      }
      
      throw new Error(`Failed to create file: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('File created successfully:', data);
    
    return {
      success: true,
      fileId: data.id
    };
  } catch (error: any) {
    console.error('Error creating plan file:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to create plan file' 
    };
  }
};

/**
 * Update an existing plan file in Google Drive
 */
const updatePlanFile = async (
  accessToken: string,
  fileId: string,
  plan: any
): Promise<{ success: boolean; fileId?: string; error?: string }> => {
  try {
    console.log('Updating existing file:', fileId);
    // Prepare the content
    const planContent = JSON.stringify(plan);
    
    // Send request to update the file content
    const response = await fetch(
      `${GOOGLE_DRIVE_UPLOAD_URL}/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: planContent
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Update API response error:', response.status, errorText);
      throw new Error(`Failed to update file: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('File updated successfully:', data);
    
    return {
      success: true,
      fileId: data.id
    };
  } catch (error: any) {
    console.error('Error updating plan file:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to update plan file' 
    };
  }
}; 