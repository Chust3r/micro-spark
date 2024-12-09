import { EmitResult, ErrorListener, Listener } from './types'

/**
 * Pulse is a modern, lightweight, and environment-agnostic event emitter
 * written in TypeScript. It supports advanced features such as wildcard
 * pattern matching, weak listeners, and custom error handling.
 *
 * @template Events A map of event names to their associated listener parameter types.
 *
 * @example
 * // Defining event types
 * type Events = {
 *   message: string;
 *   error: { code: number; message: string };
 * };
 *
 * // Creating a new Pulse instance
 * const emitter = new Pulse<Events>();
 *
 * // Registering a listener for the "message" event
 * emitter.on('message', (msg) => {
 *   console.log(`Received message: ${msg}`);
 * });
 *
 * // Emitting the "message" event
 * emitter.emit('message', 'Hello, World!');
 *
 * // Registering a one-time listener for the "error" event
 * emitter.once('error', (err) => {
 *   console.error(`Error occurred: ${err.message} (code: ${err.code})`);
 * });
 *
 * // Emitting the "error" event
 * emitter.emit('error', { code: 500, message: 'Internal Server Error' });
 */

export class Pulse<Events extends Record<string, any>> {
	private events: Map<string, Listener[]>
	private weakListeners: WeakMap<object, Set<Listener<any>>>
	private errorListeners: Array<ErrorListener> = []

	/**
	 * Creates a new instance of the Pulse event emitter.
	 */
	constructor() {
		this.events = new Map()
		this.weakListeners = new WeakMap()
	}

	/**
	 * Registers a listener for a specific event.
	 *
	 * @param {keyof Events} event - The name of the event or a wildcard pattern (e.g., `user.*`).
	 * @param {Listener<Events[Event]>} listener - The function to be called when the event is emitted.
	 *
	 * @example
	 * emitter.on('message', (msg) => {
	 *   console.log(`Message: ${msg}`);
	 * });
	 */
	on<Event extends keyof Events>(
		event: Event,
		listener: Listener<Events[Event]>
	): void {
		const pattern =
			this.getWildcardPattern(event as string) || (event as string)

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
	 * @param {keyof Events} event - The name of the event or a wildcard pattern.
	 * @param {Listener<Events[Event]>} listener - The function to be called when the event is emitted.
	 * @param {number} [maxEmits=1] - The maximum number of times the listener should be invoked.
	 *
	 * @example
	 * emitter.once('message', (msg) => {
	 *   console.log(`One-time message: ${msg}`);
	 * });
	 */
	once<Event extends keyof Events>(
		event: Event,
		listener: Listener<Events[Event]>,
		maxEmits: number = 1
	): void {
		let emitCount = 0

		const onceWrapper: Listener<Events[Event]> = (...args) => {
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
	 * @param {keyof Events} event - The name of the event or a wildcard pattern.
	 * @param {Listener<Events[Event]>} [listener] - The listener function to be removed. If not provided, all listeners for the event will be removed.
	 *
	 * @example
	 * emitter.off('message', listener);
	 */
	off<Event extends keyof Events>(
		event: Event,
		listener?: Listener<Events[Event]>
	): void {
		const pattern =
			this.getWildcardPattern(event as string) || (event as string)
		if (this.events.has(pattern)) {
			if (!listener) {
				this.events.delete(pattern)
			} else {
				const listeners = this.events.get(pattern)!
				const filtered = listeners.filter((l) => l !== listener)
				this.events.set(pattern, filtered)
			}
		}
	}

	/**
	 * Emits an event, invoking all matching listeners.
	 *
	 * @param {keyof Events} event - The name of the event.
	 * @param {...Events[Event]} args - Arguments to be passed to the listeners.
	 *
	 * @returns {EmitResult | Promise<EmitResult>} The result of the emit operation, including any errors.
	 *
	 * @example
	 * emitter.emit('message', 'Hello, World!');
	 */
	emit<Event extends keyof Events>(
		event: Event,
		...args: Events[Event][]
	): EmitResult | Promise<EmitResult> {
		const errors: Error[] = []
		const promises: Promise<void>[] = []

		const processedArgs = args.map((arg) =>
			typeof arg === 'function' ? arg() : arg
		)

		for (const [key, listeners] of this.events.entries()) {
			if (
				typeof key === 'string' &&
				this.eventMatches(key, event as string)
			) {
				listeners.forEach((listener) => {
					try {
						const result = listener(...processedArgs)
						if (result instanceof Promise) promises.push(result)
					} catch (err) {
						this.emitError(event as string, err as Error)
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
					this.emitError(event as string, err as Error)
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
	 *
	 * @example
	 * emitter.onError((event, error) => {
	 *   console.error(`Error in event "${event}": ${error.message}`);
	 * });
	 */
	onError(handler: ErrorListener): void {
		this.errorListeners.push(handler)
	}

	// Private helper methods...

	private emitError(event: string, err: Error): void {
		this.errorListeners.forEach((listener) => listener(event, err))
	}

	private getWildcardPattern(event: string): string | undefined {
		return event.includes('*') ? event.replace(/\*/g, '.*') : undefined
	}

	private eventMatches(pattern: string, event: string): boolean {
		if (pattern.includes('.*')) {
			const regex = new RegExp(`^${pattern}$`)
			return regex.test(event)
		}
		return pattern === event
	}
}
