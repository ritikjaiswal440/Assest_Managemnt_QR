/**
 * Centralized API Service Layer for AV Dynamic
 * Unifies the legacy api.js and assetApi.js under a single monolithic router.
 */

const API_URL = import.meta.env.VITE_GAS_API_URL;

/**
 * Core network wrapper for all API calls
 * Bypasses CORS and redirects properly.
 */
const genericPost = async (action, payload = {}, timeoutMs = 30000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const url = new URL(API_URL);
        url.searchParams.append("action", action); // Primary Route

        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8' // Bypass CORS preflight
            },
            body: JSON.stringify({ action, ...payload }), // Fallback Route
            redirect: 'follow',
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // FIX: Handle both Boolean (success: true) and Legacy String (status: 'success') paradigms
        const isSuccessful = data.success === true || data.status === 'success';

        if (!isSuccessful) {
            throw new Error(data.message || data.error || 'Unknown API error');
        }

        // NORMALIZE: Ensure the returned object always has a .success boolean
        // This prevents frontend components like ReportingDashboard from ignoring the payload.
        if (data.success === undefined && data.status === 'success') {
            data.success = true;
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

        return { success: false, message: friendlyMessage, data: null };
    }
};

/**
 * Perform a GET request to fetch data, bypassing browser cache.
 */
const genericGet = async (action) => {
    try {
        const url = new URL(API_URL);
        url.searchParams.append("action", action);
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
        console.error(`API GET Error [${action}]:`, error);
        throw error;
    }
};

// --- AUTHENTICATION ---
export const loginUser = (email, password) => genericPost('login', { email, password });

// --- DATA FETCHING (DROPDOWNS / LISTS) ---
export const fetchDropdownData = () => genericPost('getDropdownData');
export const getCompanies = () => genericGet('getCompanies');
export const fetchCompanies = () => genericPost('getCompanies');
export const getComplaints = () => genericGet('getComplaints');

// --- INTAKE & COMPLAINTS ---
export const submitComplaint = (payload) => genericPost('submitComplaint', payload);
export const pushToIntakeQueue = (payload) => genericPost('pushToIntake', payload);
export const fetchIntakeQueue = () => genericPost('fetchIntakeQueue');
export const submitIntake = (payload) => genericPost('submitRequest', payload);
export const submitToIntakeQueue = (payload) => genericPost('submitIntake', payload);
export const fetchEngineers = () => genericPost('getEngineers');
export const fetchAssets = () => genericPost('getAssets');

// --- TICKET MANAGEMENT ---
export const createMasterTicket = (payload) => genericPost('createMasterTicket', payload);
export const fetchMasterTickets = () => genericPost('fetchMasterTickets');
export const promoteTicket = (payload) => genericPost('promoteTicket', payload);
export const resolveTicket = (payload) => genericPost('resolveTicket', payload);
export const resolveTask = (taskData) => genericPost('resolveTask', taskData);
export const fetchSystemLogs = (ticketId) => genericPost('fetchLogs', { Ticket_ID: ticketId });
export const assignTicket = (payload) => genericPost('assignTicket', payload);
export const updateTaskStatus = (payload) => genericPost('updateChildTicket', payload);
export const addParentRemark = (payload) => genericPost('addParentRemark', payload);
export const trackTicket = (query) => genericPost('trackTicket', { trackingQuery: query });
export const searchTicket = (term) => genericPost('searchTicket', { searchTerm: term });
export const closeParentTicket = (payload) => genericPost('closeParentTicket', payload);
export const validateRef = (payload) => genericPost('validateRef', payload);
export const generateServiceReport = (ticketId) => genericPost('generateServiceReport', { Ticket_ID: ticketId });

// --- ASSET/COMPANY MANAGEMENT ---
export const getPublicAssetDetails = (payload) => genericPost('getPublicAssetDetails', payload);
export const updateCompany = (originalKeys, updatedData) => genericPost('updateCompany', { originalKeys, newData: updatedData });
export const exportBulkData = (sheetName) => genericPost('exportData', { sheetName });
export const importBulkData = (sheetName, dataMatrix) => genericPost('importBulkData', { sheetName, dataMatrix });
export const bulkUpdateAmcBySalesOrder = (payload) => genericPost('bulkUpdateAmcBySalesOrder', payload);
export const updateSalesOrderContracts = (payload) => genericPost('updateSalesOrderContracts', payload);
export const getAssetInventory = () => genericPost('getAssets');




// --- ANALYTICS ---
export const fetchAnalytics = () => genericPost('fetchAnalytics');
export const getDashboard = () => genericPost('getDashboard');

// --- LEGACY ALIASES (Do not use for new code) ---
export const gasApi = genericPost;
export const assetApi = (action, payload) => {
    if (action === 'getAssetInventory') {
        return genericPost('getAssets', payload);
    }
    return genericPost(action, payload);
};
