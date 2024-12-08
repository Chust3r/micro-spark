export type Listener<T = any> = (...args: T[]) => void | Promise<void>

export type EventMap = Map<string, Listener[]>

export interface PulseOptions {
	enableEventHistory?: boolean
	maxListeners?: number
}

export interface EventPayload<T = any> {
	event: string
	args: T[]
	timestamp: Date
}

export interface EmitResult {
	success: boolean
	errors?: Error[]
}
