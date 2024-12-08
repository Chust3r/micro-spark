import {
	EmitResult,
	ErrorListener,
	EventMap,
	Listener,
	PatternListener,
} from './types'

/**
 * Pulse is an advanced, lightweight, and environment-agnostic EventEmitter
 * designed to handle both synchronous and asynchronous event listeners.
 * It supports features like one-time listeners, pattern-based events,
 * error handling, and event removal with flexibility and precision.
 *
 * Key Features:
 * - Synchronous and asynchronous listener support.
 * - Register one-time listeners with an optional limit on executions.
 * - Pattern-based event matching using regular expressions.
 * - Built-in error handling with custom error listeners.
 * - Weak reference listener management for object-based listeners.
 * - Retrieve, clear, or remove listeners for specific or wildcard events.
 * - Environment-agnostic and suitable for use in Node.js, Bun, Deno, or browser environments.
 *
 * Example Usage:
 * const emitter = new Pulse();
 *
 * // Register a basic listener
 * emitter.on('event', (data) => console.log(data));
 *
 * // Emit an event
 * emitter.emit('event', 'Hello, world!');
 *
 * // Register a pattern-based listener
 * emitter.onPattern(/^user:.+$/, (event, data) => console.log(`Pattern: ${event}`, data));
 * emitter.emit('user:login', { userId: 123 });
 *
 * // Handle errors
 * emitter.onError((event, error) => console.error(`Error in ${event}:`, error));
 *
 * // Use one-time listeners
 * emitter.once('single', (data) => console.log('One-time event:', data), 2);
 * emitter.emit('single', 'Run 1');
 * emitter.emit('single', 'Run 2');
 * emitter.emit('single', 'Run 3'); // Will not execute
 */

export class Pulse {
	private events: EventMap
	private weakListeners: WeakMap<object, Set<Listener<any>>>
	private wildcardEvents: Map<RegExp, PatternListener[]> = new Map()
	private errorListeners: Array<ErrorListener> = []
	/**
	 * Creates a new Pulse instance.
	 *
	 * @param options - Optional configuration for the EventEmitter.
	 */
	constructor() {
		this.weakListeners = new WeakMap()
		this.events = new Map()
	}

	/**
	 * Registers a listener for a specified event (exact match only).
	 *
	 * @param event - The name of the event.
	 * @param listener - The function to execute when the event is emitted.
	 */
	on<T = any>(event: string, listener: Listener<T>): void {
		if (!this.events.has(event)) {
			this.events.set(event, [])
		}

		if (listener instanceof Object) {
			let listenersSet = this.weakListeners.get(listener) || new Set()
			listenersSet.add(listener)
			this.weakListeners.set(listener, listenersSet)
		}

		this.events.get(event)!.push(listener)
	}

	/**
	 * Registers a one-time listener for a specified event with a limit on the number of emissions.
	 * The listener is removed after it has been emitted a specified number of times.
	 *
	 * @param event - The name of the event.
	 * @param listener - The function to execute when the event is emitted.
	 * @param maxEmits - The maximum number of times the listener will be called before being removed. Default is 1.
	 */
	once<T = any>(
		event: string,
		listener: Listener<T>,
		maxEmits: number = 1
	): void {
		let emitCount = 0

		const onceWrapper: Listener<T> = (...args) => {
			if (emitCount < maxEmits) {
				listener(...args)
				emitCount++
			}

			if (emitCount >= maxEmits) {
				this.off(event, onceWrapper)
			}
		}

		this.on(event, onceWrapper)
	}

	/**
	 * Registers a listener for an event pattern (supports regular expressions).
	 *
	 * @param pattern - The regular expression pattern to match events.
	 * @param listener - The function to execute when an event matching the pattern is emitted.
	 */
	onPattern<T = any>(
		pattern: string | RegExp,
		listener: PatternListener<T>
	): void {
		if (typeof pattern === 'string') {
			pattern = new RegExp(pattern.replace('*', '.*'))
		}

		if (!this.wildcardEvents.has(pattern)) {
			this.wildcardEvents.set(pattern, [])
		}

		this.wildcardEvents.get(pattern)!.push(listener)
	}

	/**
	 * Registers a one-time listener for an event pattern.
	 *
	 * @param pattern - The regular expression pattern to match events.
	 * @param listener - The function to execute when an event matching the pattern is emitted.
	 * @param maxEmits - The maximum number of times the listener will be called before being removed. Default is 1.
	 */
	oncePattern<T = any>(
		pattern: string | RegExp,
		listener: PatternListener<T>,
		maxEmits: number = 1
	): void {
		if (typeof pattern === 'string') {
			pattern = new RegExp(pattern.replace('*', '.*'))
		}

		let emitCount = 0
		const onceWrapper: PatternListener<T> = (event, ...args) => {
			if (emitCount < maxEmits) {
				listener(event, ...args)
				emitCount++
			}

			if (emitCount >= maxEmits) {
				this.offPattern(pattern, onceWrapper)
			}
		}

		this.onPattern(pattern, onceWrapper)
	}

	/**
	 * Removes a listener for a specific event pattern.
	 *
	 * @param pattern - The regular expression pattern to match events.
	 * @param listener - The listener to remove.
	 */
	offPattern<T = any>(
		pattern: string | RegExp,
		listener: PatternListener<T>
	): void {
		if (typeof pattern === 'string') {
			pattern = new RegExp(pattern.replace('*', '.*'))
		}

		const listeners = this.wildcardEvents.get(pattern)
		if (listeners) {
			this.wildcardEvents.set(
				pattern,
				listeners.filter((l) => l !== listener)
			)
		}
	}

	/**
	 * Removes a specific listener or all listeners for a given event.
	 *
	 * @param event - The name of the event.
	 * @param listener - *(Optional)* The specific listener to remove. If not provided, all listeners for the event are removed.
	 */
	off<T = any>(event: string, listener?: Listener<T>): void {
		if (this.events.has(event)) {
			const listeners = this.events.get(event)!

			if (!listener) {
				this.events.delete(event)
			} else {
				const filteredListeners = listeners.filter((l) => l !== listener)
				if (filteredListeners.length === 0) {
					this.events.delete(event)
				} else {
					this.events.set(event, filteredListeners)
				}

				if (listener instanceof Object) {
					const listenersSet = this.weakListeners.get(listener)
					listenersSet?.delete(listener)
					if (listenersSet?.size === 0) {
						this.weakListeners.delete(listener)
					}
				}
			}
		}

		this.removeWildcardListener(event, listener)
	}

	/**
	 * Emits an event, invoking all registered listeners for the event.
	 *
	 * @param event - The name of the event.
	 * @param args - Arguments to pass to the listeners.
	 * @returns An object indicating whether the emission was successful and any errors that occurred.
	 */
	emit<T = any>(
		event: string,
		...args: T[]
	): EmitResult | Promise<EmitResult> {
		const errors: Error[] = []
		const promises: Promise<void>[] = []

		const listeners = this.events.get(event)
		if (listeners && listeners.length > 0) {
			for (const listener of listeners) {
				try {
					const result = listener(...args)
					if (result instanceof Promise) {
						promises.push(result)
					}
				} catch (err) {
					this.emitError(event, err as Error)
					errors.push(err as Error)
				}
			}
		}

		for (const [pattern, listeners] of this.wildcardEvents.entries()) {
			if (pattern.test(event)) {
				if (listeners && listeners.length > 0) {
					for (const listener of listeners) {
						try {
							listener(event, ...args)
						} catch (err) {
							this.emitError(event, err as Error)
							errors.push(err as Error)
						}
					}
				}
			}
		}

		if (promises.length > 0) {
			return Promise.all(promises)
				.then(() => {
					return errors.length > 0
						? { success: false, errors }
						: { success: true }
				})
				.catch((err) => {
					this.emitError(event, err as Error)
					errors.push(err as Error)
					return { success: false, errors }
				})
		}

		return errors.length > 0 ? { success: false, errors } : { success: true }
	}

	/**
	 * Emits an error event. This method is private and can only be called internally to emit error events.
	 *
	 * @param event - The event that caused the error.
	 * @param err - The error that occurred.
	 */
	private emitError(event: string, err: Error): void {
		this.errorListeners.forEach((listener) => {
			listener(event, err)
		})
	}

	/**
	 * Registers an error handler to listen for all emitted errors.
	 *
	 * @param handler - A function that will handle emitted errors.
	 */
	onError(handler: (event: string, error: Error) => void): void {
		this.errorListeners.push(handler)
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
	 * Removes all listeners for a specific event or all events.
	 *
	 * @param event - *(Optional)* The name of the event. If not provided, all events are cleared.
	 */
	clear(event?: string): void {
		if (event) {
			this.events.delete(event)
			const wildcardPattern = this.getWildcardPattern(event)
			if (wildcardPattern) {
				this.wildcardEvents.delete(wildcardPattern)
			}
		} else {
			this.events.clear()
			this.wildcardEvents.clear()
		}
	}

	/**
	 * Helper method to extract the wildcard pattern from an event string.
	 *
	 * @param event - The event name.
	 * @returns The wildcard pattern if applicable.
	 */
	private getWildcardPattern(event: string): RegExp | undefined {
		if (event.includes('*')) {
			return new RegExp(event.replace('*', '.*'))
		}
		return undefined
	}

	/**
	 * Removes a listener for a specific event pattern.
	 *
	 * @param event - The name of the event.
	 * @param listener - The listener to remove.
	 */
	private removeWildcardListener<T>(
		event: string,
		listener: Listener<T> | undefined
	): void {
		for (const [pattern, listeners] of this.wildcardEvents.entries()) {
			if (pattern.test(event)) {
				const index = listeners.indexOf(listener as PatternListener)
				if (index !== -1) {
					listeners.splice(index, 1)
				}
			}
		}
	}
}
