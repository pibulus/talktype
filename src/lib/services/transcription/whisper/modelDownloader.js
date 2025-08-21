/**
 * Model Downloader - UI state management for Whisper model downloads
 * Provides progress tracking and status updates for the download UI
 */

import { writable, get } from "svelte/store";

// Download status store for UI updates
export const downloadStatus = writable({
  inProgress: false,
  progress: 0,
  stage: null, // 'initializing', 'downloading', 'loading', 'ready'
  modelId: null,
  error: null,
  speed: 0,
  eta: null,
  bytesLoaded: 0,
  bytesTotal: 0,
});

// History of downloaded models
export const downloadHistory = writable([]);

/**
 * Update download status with new values
 */
export function updateDownloadStatus(updates) {
  downloadStatus.update((current) => ({ ...current, ...updates }));
}

/**
 * Set download progress
 */
export function setProgress(percentage, stage = null) {
  const updates = { progress: Math.round(percentage * 100) };
  if (stage) {
    updates.stage = stage;
  }
  updateDownloadStatus(updates);
}

/**
 * Mark download as complete
 */
export function setComplete() {
  const status = get(downloadStatus);
  
  // Add to history
  downloadHistory.update((history) => [
    ...history,
    {
      modelId: status.modelId,
      timestamp: Date.now(),
      success: true,
    },
  ]);

  // Update status to show complete
  downloadStatus.update((current) => ({
    ...current,
    inProgress: false,
    progress: 100,
    stage: "complete",
    error: null,
    speed: 0,
    eta: null,
  }));
  
  // Clear the download status after a delay to show completion
  setTimeout(() => {
    downloadStatus.update((current) => {
      // Only clear if this is still the same model
      if (current.modelId === status.modelId && current.stage === "complete") {
        return {
          inProgress: false,
          progress: 0,
          stage: null,
          modelId: null,
          error: null,
          speed: 0,
          eta: null,
          bytesLoaded: 0,
          bytesTotal: 0,
        };
      }
      return current;
    });
  }, 2000); // Show complete status for 2 seconds
}

/**
 * Set download error
 */
export function setError(error) {
  const status = get(downloadStatus);
  
  // Add to history
  downloadHistory.update((history) => [
    ...history,
    {
      modelId: status.modelId,
      timestamp: Date.now(),
      success: false,
      error: error,
    },
  ]);

  // Update status
  downloadStatus.update((current) => ({
    ...current,
    inProgress: false,
    error: error,
    stage: "error",
  }));
}

/**
 * Calculate download speed and ETA
 */
let downloadStartTime = null;
let lastUpdate = null;

export function updateDownloadMetrics(bytesLoaded, bytesTotal) {
  const now = Date.now();
  
  if (!downloadStartTime) {
    downloadStartTime = now;
    lastUpdate = now;
  }

  const elapsedSeconds = (now - downloadStartTime) / 1000;
  const speed = bytesLoaded / elapsedSeconds; // bytes per second
  const remainingBytes = bytesTotal - bytesLoaded;
  const eta = remainingBytes / speed; // seconds

  updateDownloadStatus({
    bytesLoaded,
    bytesTotal,
    speed: Math.round(speed),
    eta: Math.round(eta),
  });

  lastUpdate = now;
}

/**
 * Reset download metrics
 */
export function resetDownloadMetrics() {
  downloadStartTime = null;
  lastUpdate = null;
  downloadStatus.set({
    inProgress: false,
    progress: 0,
    stage: null,
    modelId: null,
    error: null,
    speed: 0,
    eta: null,
    bytesLoaded: 0,
    bytesTotal: 0,
  });
}

/**
 * Format bytes for display
 */
export function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Format ETA for display
 */
export function formatETA(seconds) {
  if (!seconds || seconds < 0) return "calculating...";
  
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Check if a model has been downloaded before
 */
export function hasDownloadedModel(modelId) {
  const history = get(downloadHistory);
  return history.some((item) => item.modelId === modelId && item.success);
}