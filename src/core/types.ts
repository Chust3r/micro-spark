export type Listener<T = any> = (...args: T[]) => void | Promise<void>

export interface EmitResult {
	success: boolean
	errors?: Error[]
}

export type ErrorListener = (event: string, err: Error) => void
