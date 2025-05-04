import { useCallback, useState, useEffect } from "react";




// Function to generate JWT and get access token
async function getAccessToken() {
  try {
    // For client-side, we'll use a third-party library to handle JWT creation
    // This is a simplified approach for a hackathon
    // Using the jose library which works in browsers
    const jose = await import('jose');
    
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: serviceAccountKey.client_email,
      scope: 'https://www.googleapis.com/auth/devstorage.read_write',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600, // 1 hour
      iat: now
    };
    
    // Convert the private key from PEM format
    const privateKey = await jose.importPKCS8(serviceAccountKey.private_key, 'RS256');
    
    // Create the JWT
    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256' })
      .sign(privateKey);
    
    // Exchange JWT for access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to get access token');
    }
    
    const tokenData = await response.json();
    return tokenData.access_token;
  } catch (error) {
    console.error('Error generating access token:', error);
    throw error;
  }
}

export const useGoogle = (): {
  uploadFiles: (files: File[]) => Promise<string[]>;
} => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  
  // Get access token on component mount
  useEffect(() => {
    getAccessToken()
      .then(token => setAccessToken(token))
      .catch(error => console.error('Failed to get access token:', error));
  }, []);
  
  const uploadFiles = useCallback(async (files: File[]) => {
    // If we don't have a token yet, get one
    if (!accessToken) {
      const token = await getAccessToken();
      setAccessToken(token);
    }
    
    // Array to store all upload URLs
    const uploadedUrls: string[] = [];
    
    // Create a bucket name - you'll need to configure this
    const bucketName = "etz-store";
    const googleCloudStorageUrl = `https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o`;
    
    // Process each file upload sequentially
    for (const file of files) {
      try {
        // Create a unique file name to avoid collisions and include the raw-audio folder
        const fileName = `raw-audio/${Date.now()}-${file.name}`;
        
        // Set up query parameters
        const queryParams = new URLSearchParams({
          name: fileName,
          uploadType: 'media'
        });
        
        // Make the upload request
        const response = await fetch(`${googleCloudStorageUrl}?${queryParams.toString()}`, {
          method: 'POST',
          headers: {
            'Content-Type': file.type,
            'Authorization': `Bearer ${accessToken}`
          },
          body: file
        });
        
        if (!response.ok) {
          throw new Error(`Failed to upload file: ${file.name}`);
        }
        
        const data = await response.json();
        // The public URL format for GCS objects
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
        uploadedUrls.push(publicUrl);
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        throw error;
      }
    }
    
    return uploadedUrls;
  }, [accessToken]);

  return { uploadFiles };
}