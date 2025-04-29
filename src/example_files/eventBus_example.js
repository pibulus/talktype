/**
 * EventBus - Provides event-based communication between services
 * 
 * This decouples services by allowing them to communicate without direct dependencies.
 * Lower-level services can emit events that higher-level services can subscribe to,
 * enabling communication from domain services to application services without
 * creating circular dependencies.
 */
export class EventBus {
  constructor() {
    this.listeners = new Map();
    
    // For debugging purposes
    this.debug = false;
  }
  
  /**
   * Subscribe to an event
   * @param {string} event - Event name to subscribe to
   * @param {Function} callback - Function to call when event is emitted
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    const callbacks = this.listeners.get(event);
    callbacks.push(callback);
    
    if (this.debug) {
      console.log(`[EventBus] Subscribed to event: ${event}, total listeners: ${callbacks.length}`);
    }
    
    // Return unsubscribe function
    return () => this.off(event, callback);
  }
  
  /**
   * Unsubscribe from an event
   * @param {string} event - Event name to unsubscribe from
   * @param {Function} callback - Callback to remove
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    
    if (index !== -1) {
      callbacks.splice(index, 1);
      
      if (this.debug) {
        console.log(`[EventBus] Unsubscribed from event: ${event}, remaining listeners: ${callbacks.length}`);
      }
    }
  }
  
  /**
   * Emit an event with data
   * @param {string} event - Event name to emit
   * @param {any} data - Data to pass to subscribers
   */
  emit(event, data) {
    if (!this.listeners.has(event)) {
      if (this.debug) {
        console.log(`[EventBus] Event emitted with no listeners: ${event}`);
      }
      return;
    }
    
    if (this.debug) {
      console.log(`[EventBus] Emitting event: ${event}`, data);
    }
    
    this.listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[EventBus] Error in event listener for ${event}:`, error);
      }
    });
  }
  
  /**
   * Enable or disable debug mode
   * @param {boolean} enabled - Whether to enable debug mode
   */
  setDebug(enabled) {
    this.debug = enabled;
    console.log(`[EventBus] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Get all registered event types
   * @returns {Array<string>} Array of event names
   */
  getRegisteredEvents() {
    return Array.from(this.listeners.keys());
  }
  
  /**
   * Get the number of listeners for a specific event
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   */
  getListenerCount(event) {
    if (!this.listeners.has(event)) return 0;
    return this.listeners.get(event).length;
  }
}

// Export a singleton instance for convenience
export const eventBus = new EventBus();