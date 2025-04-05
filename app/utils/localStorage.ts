// Utility functions for localStorage management

/**
 * Clears localStorage data only on page reload/refresh
 * This distinguishes between actual page reloads and normal component mounts
 */
export const clearLocalStorageOnReload = () => {
  // Set a flag in sessionStorage
  if (!sessionStorage.getItem('app_initialized')) {
    console.log("Page was reloaded/refreshed - clearing localStorage");
    localStorage.clear();
    sessionStorage.setItem('app_initialized', 'true');
  } else {
    console.log("App already initialized - not clearing localStorage");
  }
};

/**
 * Get item from localStorage with error handling
 */
export const getFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error retrieving ${key} from localStorage:`, error);
    return defaultValue;
  }
};

/**
 * Save item to localStorage with error handling
 */
export const saveToStorage = (key: string, value: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
}; 