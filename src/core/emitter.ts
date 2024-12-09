import { EmitResult, ErrorListener, EventMap, Listener } from './types'

/**
 * Pulse is an advanced event emitter class that supports regular events,
 * wildcard pattern matching, weak listeners, and custom error handling.
 */
export class Pulse {
	private events: EventMap
	private weakListeners: WeakMap<object, Set<Listener<any>>>
	private errorListeners: Array<ErrorListener> = []

	/**
	 * Creates a new instance of the Pulse event emitter.
	 */
	constructor() {
		this.weakListeners = new WeakMap()
		this.events = new Map()
	}

	/**
	 * Registers a listener for a specific event.
	 *
	 * @param {string} event - The name of the event or a wildcard pattern (e.g., `user.*`).
	 * @param {Listener<T>} listener - The function to be called when the event is emitted.
	 * @template T - The type of arguments the listener will receive.
	 */
	on<T = any>(event: string, listener: Listener<T>): void {
		const pattern = this.getWildcardPattern(event) || event
		if (!this.events.has(pattern)) {
			this.events.set(pattern, [])
		}

		this.events.get(pattern)!.push(listener)

		if (typeof listener === 'object') {
			let listenersSet = this.weakListeners.get(listener) || new Set()
			listenersSet.add(listener)
			this.weakListeners.set(listener, listenersSet)
		}
	}

	/**
	 * Registers a one-time listener for a specific event.
	 *
	 * @param {string} event - The name of the event or a wildcard pattern.
	 * @param {Listener<T>} listener - The function to be called when the event is emitted.
	 * @param {number} [maxEmits=1] - The maximum number of times the listener should be invoked.
	 * @template T - The type of arguments the listener will receive.
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
	 * Removes a listener from a specific event.
	 *
	 * @param {string} event - The name of the event or a wildcard pattern.
	 * @param {Listener<T>} [listener] - The listener function to be removed. If not provided, all listeners for the event will be removed.
	 * @template T - The type of arguments the listener received.
	 */
	off<T = any>(event: string, listener?: Listener<T>): void {
		const pattern = this.getWildcardPattern(event) || event
		if (this.events.has(pattern)) {
			if (!listener) {
				this.events.delete(pattern)
			} else {
				const listeners = this.events.get(pattern)!
				const filtered = listeners.filter((l) => l !== listener)
				this.events.set(pattern, filtered)

				if (listener instanceof Object) {
					const listenersSet = this.weakListeners.get(listener)
					listenersSet?.delete(listener)
					if (listenersSet?.size === 0) {
						this.weakListeners.delete(listener)
					}
				}
			}
		}
	}

	/**
	 * Emits an event, invoking all matching listeners.
	 *
	 * @param {string} event - The name of the event.
	 * @param {...T[]} args - Arguments to be passed to the listeners.
	 * @returns {EmitResult | Promise<EmitResult>} - The result of the emission, either synchronously or as a promise.
	 * @template T - The type of arguments to be emitted.
	 */
	emit<T = any>(
		event: string,
		...args: T[]
	): EmitResult | Promise<EmitResult> {
		const errors: Error[] = []
		const promises: Promise<void>[] = []

		// Pre-process arguments: resolve functions and keep other types as is
		const processedArgs = args.map((arg) =>
			typeof arg === 'function' ? arg() : arg
		)

		for (const [key, listeners] of this.events.entries()) {
			if (typeof key === 'string' && this.eventMatches(key, event)) {
				listeners.forEach((listener) => {
					try {
						const result = listener(...processedArgs)
						if (result instanceof Promise) promises.push(result)
					} catch (err) {
						this.emitError(event, err as Error)
						errors.push(err as Error)
					}
				})
			}
		}

		if (promises.length > 0) {
			return Promise.all(promises)
				.then(() =>
					errors.length > 0
						? { success: false, errors }
						: { success: true }
				)
				.catch((err) => {
					this.emitError(event, err as Error)
					errors.push(err as Error)
					return { success: false, errors }
				})
		}

		return errors.length > 0 ? { success: false, errors } : { success: true }
	}

	/**
	 * Registers an error handler for the event emitter.
	 *
	 * @param {ErrorListener} handler - A function to handle errors emitted during listener execution.
	 */
	onError(handler: (event: string, error: Error) => void): void {
		this.errorListeners.push(handler)
	}

	/**
	 * Emits an error to all registered error listeners.
	 *
	 * @private
	 * @param {string} event - The name of the event where the error occurred.
	 * @param {Error} err - The error to be emitted.
	 */
	private emitError(event: string, err: Error): void {
		this.errorListeners.forEach((listener) => listener(event, err))
	}

	/**
	 * Returns a wildcard pattern for an event if applicable.
	 *
	 * @private
	 * @param {string} event - The event name to analyze.
	 * @returns {string | undefined} - The wildcard pattern if applicable, otherwise `undefined`.
	 */
	private getWildcardPattern(event: string): string | undefined {
		return event.includes('*') ? event.replace(/\*/g, '.*') : undefined
	}

	/**
	 * Checks if an event matches a pattern.
	 *
	 * @private
	 * @param {string} pattern - The pattern to match.
	 * @param {string} event - The event name.
	 * @returns {boolean} - `true` if the event matches the pattern, otherwise `false`.
	 */
	private eventMatches(pattern: string, event: string): boolean {
		if (pattern.includes('.*')) {
			const regex = new RegExp(`^${pattern}$`)
			return regex.test(event)
		}
		return pattern === event
	}
}
