const GAS_URL = import.meta.env.VITE_GAS_API_URL;

export const gasApi = async (action, payload = {}, timeoutMs = 30000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST', // Always use POST to avoid URL length limits
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Bypass CORS preflight
      },
      // We bundle the 'action' router and the data payload together
      body: JSON.stringify({ action, ...payload }), 
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Unknown API error');
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`API Error [${action}]:`, error);

    let friendlyMessage = 'An unexpected error occurred. Please try again.';
    if (error.name === 'AbortError') {
      friendlyMessage = 'Operational Sync Timeout: The server took too long to respond. Please check your connection and retry.';
    } else if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      friendlyMessage = 'Operational Sync Failure: Unable to establish a secure link with the database (CORS preflight or offline network state).';
    } else {
      friendlyMessage = error.message || friendlyMessage;
    }

    // Return a structured error so the UI can display it gracefully
    return { success: false, message: friendlyMessage, data: null };
  }
};