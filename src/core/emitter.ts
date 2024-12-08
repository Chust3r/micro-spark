import {
	PulseOptions,
	EmitResult,
	EventMap,
	Listener,
	PatternListener,
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
	private weakListeners: WeakMap<object, Set<Listener<any>>>
	private wildcardEvents: Map<RegExp, PatternListener[]> = new Map()

	/**
	 * Creates a new Pulse instance.
	 *
	 * @param options - Optional configuration for the EventEmitter.
	 */
	constructor(options: PulseOptions = {}) {
		this.weakListeners = new WeakMap()
		this.events = new Map()
		this.options = options
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
		// Asegúrate de que el patrón esté en la forma correcta (Reemplazando "*" por ".*")
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
		// Asegúrate de que el patrón esté en la forma correcta (Reemplazando "*" por ".*")
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
					errors.push(err as Error)
				}
			}
		}

		for (const [pattern, listeners] of this.wildcardEvents.entries()) {
			if (pattern.test(event)) {
				for (const listener of listeners) {
					try {
						listener(event, ...args)
					} catch (err) {
						errors.push(err as Error)
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
					errors.push(err as Error)
					return { success: false, errors }
				})
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
			// Remove listeners for the specific event
			this.events.delete(event)

			// Remove listeners for wildcard events if exists
			const wildcardPattern = this.getWildcardPattern(event)
			if (wildcardPattern) {
				this.wildcardEvents.delete(wildcardPattern)
			}
		} else {
			// Remove all listeners for exact events
			this.events.clear()

			// Remove all listeners for wildcard events
			this.wildcardEvents.clear()
		}
	}

	/**
	 * Check if the event includes a wildcard pattern.
	 *
	 * @param event - The event name.
	 * @returns A boolean indicating if the event includes a wildcard pattern.
	 */
	private isWildcardEvent(event: string): boolean {
		return event.includes('*')
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
	 * Elimina un listener específico o todos los listeners para un evento con patrón comodín.
	 *
	 * @param event - El nombre del evento con un comodín ('*').
	 * @param listener - *(Opcional)* El listener específico a eliminar. Si no se proporciona, se eliminan todos los listeners para el patrón.
	 */
	private removeWildcardListener(
		event: string,
		listener: Listener | undefined
	): void {
		for (const [pattern, listeners] of this.wildcardEvents.entries()) {
			if (pattern.test(event)) {
				if (!listener) {
					this.wildcardEvents.delete(pattern)
				} else {
					const filteredListeners = listeners.filter((l) => l !== listener)
					if (filteredListeners.length === 0) {
						this.wildcardEvents.delete(pattern)
					} else {
						this.wildcardEvents.set(pattern, filteredListeners)
					}
				}
			}
		}
	}
}
