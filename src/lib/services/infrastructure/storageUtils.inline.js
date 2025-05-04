// Minimal version of StorageUtils for inline use
// This needs to be inline to prevent flash of unstyled content (FOUC)
function getStorageItem(key, defaultValue) {
  if (typeof localStorage === 'undefined') return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    return item !== null ? item : defaultValue;
  } catch (e) {
    console.warn(`Error reading ${key} from localStorage:`, e);
    return defaultValue;
  }
}

function setStorageItem(key, value) {
  if (typeof localStorage === 'undefined') return false;
  
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.warn(`Error saving ${key} to localStorage:`, e);
    return false;
  }
}

// At build time, this file will be included inline in app.html