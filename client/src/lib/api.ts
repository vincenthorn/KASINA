import { apiRequest as baseApiRequest } from "./queryClient";

// Re-export the base API request function with a more convenient name
export const apiRequest = baseApiRequest;

// Admin-specific API functions
export const updateUserName = async (email: string, name: string) => {
  try {
    // Add a unique timestamp to prevent caching
    const queryParam = `?t=${Date.now()}`;
    
    const response = await fetch(`/api/admin/update-user-name${queryParam}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      credentials: 'include',
      body: JSON.stringify({ email, name })
    });
    
    // Always try to parse the response as JSON
    let data;
    const textResponse = await response.text();
    
    try {
      data = JSON.parse(textResponse);
    } catch (e) {
      console.error('Failed to parse response as JSON:', textResponse);
      throw new Error(`Invalid response format. Server returned: ${textResponse.substring(0, 100)}...`);
    }
    
    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error updating user name:', error);
    throw error;
  }
};

// Fetch kasina breakdown data
export const fetchKasinaBreakdown = async () => {
  try {
    const response = await fetch('/api/kasina-breakdown', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch kasina breakdown: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching kasina breakdown:', error);
    throw error;
  }
};

// Add more API utility functions here as needed
