/**
 * Centralized API Service Layer for AV Dynamic Asset Management & QR Complaint System.
 * Adheres to a Database-Agnostic Design, transmitting generic JSON payloads.
 */

const GAS_URL = import.meta.env.VITE_ASSET_GAS_API_URL;

if (!GAS_URL || GAS_URL.includes('YOUR_ASSET_GAS_API_URL')) {
  console.warn('WARNING: VITE_ASSET_GAS_API_URL is not configured in .env. Asset Management API requests will fail.');
}

/**
 * Sends a POST request to the Google Apps Script Web App.
 *
 * @param {string} action - The action/routing keyword handled by the GAS router (e.g. 'getAssetDetails', 'submitComplaint').
 * @param {object} payload - The generic JSON body payload associated with the action.
 * @param {object} options - Request options.
 * @param {number} [options.timeoutMs=30000] - Request timeout in milliseconds.
 * @param {AbortSignal} [options.signal] - An external AbortSignal to trigger cancelation from callers.
 * @returns {Promise<object>} The server response or structured failure object.
 */
export const assetApi = async (action, payload = {}, options = {}) => {
  const { timeoutMs = 30000, signal } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Link caller's abort signal to our fetch controller
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', () => controller.abort());
    }
  }

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Bypass CORS preflight in Google Apps Script context
      },
      body: JSON.stringify({ action, ...payload }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP network error! Status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Backend transaction failed.');
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`Asset API operational failure [${action}]:`, error);

    let friendlyMessage = 'An unexpected error occurred. Please try again.';
    if (error.name === 'AbortError') {
      friendlyMessage = 'Operational Sync Timeout: The server took too long to respond. Please check your connection and retry.';
    } else if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      friendlyMessage = 'Operational Sync Failure: Unable to establish a secure link with the database (CORS preflight or offline network state).';
    } else {
      friendlyMessage = error.message || friendlyMessage;
    }

    return {
      success: false,
      message: friendlyMessage,
      data: null,
    };
  }
};

/**
 * Perform a GET request to fetch companies, bypassing browser cache.
 */
export const getCompanies = async () => {
  try {
    const url = new URL(GAS_URL);
    url.searchParams.append("route", "getCompanies");
    url.searchParams.append("t", new Date().getTime());

    const response = await fetch(url.toString(), {
      method: 'GET',
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`HTTP network error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Asset API GET failure [getCompanies]:`, error);
    throw error;
  }
};

/**
 * Perform a POST request to update an existing company based on composite keys.
 */
export const updateCompany = async (originalKeys, updatedData) => {
  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ 
        action: 'updateCompany', 
        route: 'updateCompany', // sending both for compatibility
        originalKeys, 
        newData: updatedData 
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP network error! Status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Backend transaction failed.');
    }
    return data;
  } catch (error) {
    console.error(`Asset API POST failure [updateCompany]:`, error);
    throw error;
  }
};

/**
 * Perform a POST request to submit a public complaint.
 */
export const submitComplaint = async (payload) => {
  try {
    const url = new URL(GAS_URL);
    url.searchParams.append("action", "submitComplaint");
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: "follow"
    });
    if (!response.ok) throw new Error("API operational failure");
    return await response.json();
  } catch (error) {
    console.error(`Asset API POST failure [submitComplaint]:`, error);
    throw error;
  }
};

/**
 * Perform a GET request to fetch all complaints.
 * Uses a timestamp param to bust cache and guarantees clean DB sync.
 */
export const getComplaints = async () => {
  try {
    const url = new URL(GAS_URL);
    url.searchParams.append("action", "getComplaints");
    url.searchParams.append("t", new Date().getTime());

    const response = await fetch(url.toString(), {
      method: 'GET',
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`HTTP network error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Asset API GET failure [getComplaints]:`, error);
    throw error;
  }
};

/**
 * Perform a POST request to push a QR complaint into the Intake Queue (Requests).
 */
export const pushToIntakeQueue = async (complaintData) => {
  try {
    const url = new URL(GAS_URL);
    url.searchParams.append("action", "pushToIntake");
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(complaintData),
      redirect: "follow"
    });
    if (!response.ok) throw new Error("API operational failure");
    return await response.json();
  } catch (error) {
    console.error(`Asset API POST failure [pushToIntakeQueue]:`, error);
    throw error;
  }
};
