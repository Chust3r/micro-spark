export type Listener<T = any> = (...args: T[]) => void | Promise<void>

export type PatternListener<T = any> = (
	event: string,
	...args: T[]
) => void | Promise<void>

export type EventMap = Map<string, Listener[]>

export interface EmitResult {
	success: boolean
	errors?: Error[]
}

export type ErrorListener = (event: string, err: Error) => void
