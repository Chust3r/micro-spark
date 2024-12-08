import {
	PulseOptions,
	EmitResult,
	EventMap,
	Listener,
	EventPayload,
} from './types'

/**
 * Pulse is a lightweight, environment-agnostic EventEmitter designed to handle
 * both synchronous and asynchronous event listeners. It supports key features like
 * one-time listeners, event removal, and a limit on the number of listeners.
 *
 * Usage:
 * const emitter = new Pulse();
 * emitter.on('event', (data) => console.log(data));
 * emitter.emit('event', 'Hello, world!');
 */
export class Pulse {
	private events: EventMap
	private options: PulseOptions

	/**
	 * Creates a new Pulse instance.
	 *
	 * @param options - Optional configuration for the EventEmitter.
	 */
	constructor(options: PulseOptions = {}) {
		this.events = new Map()
		this.options = options
	}

	/**
	 * Registers a listener for a specified event.
	 *
	 * @param event - The name of the event.
	 * @param listener - The function to execute when the event is emitted.
	 */
	on<T = any>(event: string, listener: Listener<T>): void {
		if (!this.events.has(event)) {
			this.events.set(event, [])
		}
		this.events.get(event)!.push(listener)

		if (
			this.options.maxListeners &&
			this.events.get(event)!.length > this.options.maxListeners
		) {
			console.warn(
				`Max listeners exceeded for event: "${event}". Consider increasing maxListeners or reviewing listener usage.`
			)
		}
	}

	/**
	 * Registers a one-time listener for a specified event.
	 * The listener is removed after it is executed.
	 *
	 * @param event - The name of the event.
	 * @param listener - The function to execute when the event is emitted.
	 */
	once<T = any>(event: string, listener: Listener<T>): void {
		const onceWrapper: Listener<T> = (...args) => {
			this.off(event, onceWrapper)
			listener(...args)
		}
		this.on(event, onceWrapper)
	}

	/**
	 * Removes a specific listener or all listeners for a given event.
	 *
	 * @param event - The name of the event.
	 * @param listener - *(Optional)* The specific listener to remove. If not provided, all listeners for the event are removed.
	 */
	off<T = any>(event: string, listener?: Listener<T>): void {
		if (!this.events.has(event)) return

		if (!listener) {
			this.events.delete(event)
		} else {
			const listeners = this.events.get(event)!.filter((l) => l !== listener)
			if (listeners.length === 0) {
				this.events.delete(event)
			} else {
				this.events.set(event, listeners)
			}
		}
	}

	/**
	 * Emits an event, invoking all registered listeners for the event.
	 *
	 * @param event - The name of the event.
	 * @param args - Arguments to pass to the listeners.
	 * @returns An object indicating whether the emission was successful and any errors that occurred.
	 */
	emit<T = any>(event: string, ...args: T[]): EmitResult {
		const listeners = this.events.get(event)

		if (!listeners || listeners.length === 0) {
			return { success: true }
		}

		const errors: Error[] = []
		for (const listener of listeners) {
			try {
				const result = listener(...args)
				if (result instanceof Promise) {
					result.catch((err) => errors.push(err))
				}
			} catch (err) {
				errors.push(err as Error)
			}
		}

		return errors.length > 0 ? { success: false, errors } : { success: true }
	}

	/**
	 * Retrieves all listeners for a specific event.
	 *
	 * @param event - The name of the event.
	 * @returns An array of listeners registered for the event.
	 */
	listeners(event: string): Listener[] {
		return this.events.get(event) || []
	}

	/**
	 * Retrieves the number of listeners for a specific event.
	 *
	 * @param event - The name of the event.
	 * @returns The count of listeners for the event.
	 */
	listenerCount(event: string): number {
		return this.listeners(event).length
	}

	/**
	 * Removes all listeners for a specific event or all events.
	 *
	 * @param event - *(Optional)* The name of the event. If not provided, all events are cleared.
	 */
	clear(event?: string): void {
		if (event) {
			this.events.delete(event)
		} else {
			this.events.clear()
		}
	}
}
