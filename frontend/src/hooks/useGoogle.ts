import { useCallback, useState, useEffect } from "react";

const serviceAccountKey =  {
  type: "service_account",
  project_id: "etz-store",
  private_key_id: "7dda132b0d46b05699c55f4d1c7a16042497f4fb",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCOW9gQkps8jeuG\nohcxujk0tHBiERS75NOnaE33TH3YL7vPY/uqO4nuX2e7HEKOArZJSF0ExZOE/YqJ\nKLw5k+R2BzK/qYGo1+9aroBJg1ql6oAwLx4t1Dhp1QW0yvXvp7fPVUGqYn1OqmUD\nKU29w1vz6xQxJSHPbS8bnHD/BR5nWJrBaxfuQNzvcqwgrzlycmR0uW0l8zjrx898\n+uY0J+4zpcMCvBCzvkUVIFr7MJ8SiSzCjaaFB2lTvK4Dp1YX1zgSFBT3bbLyojs4\nB2KXndgRqdg9RM7doo88TNOPQeNgrRzwnF9MSEsLfbMRA14knxx2Znk3MmG1d0BW\nkBcE0z13AgMBAAECggEAN1FsL+BwT0MMuzfgUHP/R8I4C3t8tZixQFOxPEAuhKPj\n1K6S/C7/pa/QFK7iE+Hs6KQkdTa7YMnPHAZGwg78j3qzlzOsjSo/udqmQiq3PlLV\n9iNRFFjrhQCAo6TclYB0Vi5YgnecHsXq06Qor+0qnamDIqe9sCdKz21moUphaqG4\nunPxHF9TKzxsYfDQH7RQqohonG/i1ZtpMQnyIQavlyi/tenq4xqwZM6Pp9EYQ75d\nIaSsHweCYHPr2O9yhk6MTS9tsOpLH3ZVZvUzBqcq7ARw8IuwyMRreyqOzx84vaVa\n9MhKAiTx6zJjEamR1ekj+eLh4baNQ9kBlpIH3++ZKQKBgQDCGbpXBSsTZzH8FDrk\nYsp6xxh/Is0N9O2PjoC3DX2JagVzYr2JAivDHWSNLN/9+5X9tjDsl7MDqmREjRQA\nvhJL/Lt4Zn7O4icr/iwjlPTJ/YYQHZpqtpxTHpG8nug8rd7RI85m7Bo1WjAJPBO+\ndN7Y3PXE2fTlzPV8HI0l95ASrwKBgQC7wfIWsI5TThqAm4x2Y8kFkflCSIaiFy8G\nGbiu9TMR/g0cFabLZX/0uegZrYQzz7eZbEY7OCNz69bRcmabBX0ul8duRCm46CF2\nrr62ZkNJ3l2fsWd/xFFMfZxE5ZBK4D3oOCbkGcNl0vSvzrUIg2zUgThpzzmqEJ+W\ncSxHGIlTuQKBgD6hhKIttb+WDef0MyicxA8oDTyA4z+8p6cp6Vinzrk3b7jSxKvf\n+nUEF/0B3OkcdEKgtlqxfH8TTTVdfHXc3xSL4YYxNHvXN6KXanC00OQYnVi35KrI\nb9rWQ1pkwDVMOViswB4v0ykiB9wC+a/8EChT7C3v0nkQUKoSoGz+3AtbAoGBAKIb\nqfF9LuUuIiO4KWZucTml9xgLlnKMocUaoCIvApEeUCNXblNep0Oc35CMCADT7ylA\nGsM2jSWhEjB0HbLq4lJAKahCoeNMSNg3t+G0GZTFsQAYI8xkq+zm5u11Z0e+pLTD\nBpEazWI06Z6BUjyvfF9d0l9I0/jJsYAq5pfbz3XBAoGBAL5V4bSjEsvPBSf7pXAN\nQnx0THpAsnkBhrK5L8JEz6ZtufrFkl8XqFd7KVyUpENerwe+FdDoJ04ABgYT+EQN\n+MadttWcPgW6cuQccO0jb7rK9MTNRZ8r3BWCn+voTD4xS7iD1oB5M7sm2dz5F8hq\nO+z63mmq8mit9Y7OP0W4XyEv\n-----END PRIVATE KEY-----\n",
  client_email: "etz-846@etz-store.iam.gserviceaccount.com",
  client_id: "105373064696472775803",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/etz-846%40etz-store.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
}


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