import { apiRequest as baseApiRequest } from "./queryClient";

// Re-export the base API request function with a more convenient name
export const apiRequest = baseApiRequest;

// Admin-specific API functions
export const updateUserName = async (email: string, name: string) => {
  try {
    const response = await fetch('/api/admin/update-user-name', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ email, name })
    });
    
    if (!response.ok) {
      // Try to parse the error response
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating user name:', error);
    throw error;
  }
};

// Add more API utility functions here as needed
