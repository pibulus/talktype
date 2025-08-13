export class EventBus {
	constructor() {
		this.listeners = new Map();
		this.debug = false;
	}

	on(event, callback) {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, []);
		}

		const callbacks = this.listeners.get(event);
		callbacks.push(callback);

		if (this.debug) {
			console.log(`[EventBus] Subscribed to event: ${event}, total listeners: ${callbacks.length}`);
		}

		return () => this.off(event, callback);
	}

	off(event, callback) {
		if (!this.listeners.has(event)) return;

		const callbacks = this.listeners.get(event);
		const index = callbacks.indexOf(callback);

		if (index !== -1) {
			callbacks.splice(index, 1);

			if (this.debug) {
				console.log(
					`[EventBus] Unsubscribed from event: ${event}, remaining listeners: ${callbacks.length}`
				);
			}
		}
	}

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

		this.listeners.get(event).forEach((callback) => {
			try {
				callback(data);
			} catch (error) {
				console.error(`[EventBus] Error in event listener for ${event}:`, error);
			}
		});
	}

	setDebug(enabled) {
		this.debug = enabled;
		console.log(`[EventBus] Debug mode ${enabled ? 'enabled' : 'disabled'}`);
	}

	getRegisteredEvents() {
		return Array.from(this.listeners.keys());
	}

	getListenerCount(event) {
		if (!this.listeners.has(event)) return 0;
		return this.listeners.get(event).length;
	}
}

export const eventBus = new EventBus();
