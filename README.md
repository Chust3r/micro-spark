# Spark

`Spark` is a **modern**, **lightweight**, and **environment-agnostic** event emitter library built in **TypeScript**.  
It's designed for **complex event-driven systems** in **Node.js**, **Deno**, **Bun**, and browsers.  
It combines simplicity with powerful features for **maximum flexibility** and performance.

## ⚡ Quick Example

```ts
import { Spark } from 'spark'
const spark = new Spark()
spark.on('message', (msg) => console.log(msg))
spark.emit('message', 'Hello, World!')
```

## ✨ Features

-  **🔄 Wildcard Events**: Simplify event handling with pattern matching (e.g., `user.*`).
-  **🧹 Weak Listeners**: Automatically manage listener references to avoid memory leaks.
-  **⚙️ Custom Error Handling**: Robust error management with dedicated error listeners.
-  **🌍 Environment Agnostic**: Seamlessly compatible with modern runtimes: Node.js, Deno, Bun, and browsers.
-  **💡 Modern API**: Type-safe, intuitive, and designed for developer productivity.

---

## 📦 Installation

Install `spark` with your favorite package manager:

### npm:

```bash
npm install spark
```

### yarn:

```bash
yarn add spark
```

### bun:

```bash
bun add spark
```

---

## Usage Examples

### 1. Basic Example with Event Typing

Define event types and create a strongly-typed `Spark` instance to register and emit events.

```ts
import { Spark } from 'spark'

//→ Define event types
type Events = {
	message: string
	error: { code: number; message: string }
}

//→ Create a new Spark instance with event typing
const spark = new Spark<Events>()

//→ Register a listener for the "message" event
spark.on('message', (msg) => {
	console.log(`Received message: ${msg}`)
})

//→ Emit the "message" event
spark.emit('message', 'Hello, World!')

//→ Register a one-time listener for the "error" event
spark.once('error', (err) => {
	console.error(`Error occurred: ${err.message} (code: ${err.code})`)
})

//→ Emit the "error" event
spark.emit('error', { code: 500, message: 'Internal Server Error' })
```

### 2. Basic Example without Event Typing

Create an untyped `Spark` instance, allowing for more flexibility but without the benefits of TypeScript type checking.

```ts
import { Spark } from 'spark'

//→ Create a new Spark instance without specifying event types
const spark = new Spark()

//→ Register a listener for the "message" event
spark.on('message', (msg: string) => {
	console.log(`Received message: ${msg}`)
})

//→ Emit the "message" event
spark.emit('message', 'Hello, World!')

//→ Register a one-time listener for the "error" event
spark.once('error', (err: { code: number; message: string }) => {
	console.error(`Error occurred: ${err.message} (code: ${err.code})`)
})

//→ Emit the "error" event
spark.emit('error', { code: 500, message: 'Internal Server Error' })
```

### 3. Wildcard Event Matching

Use wildcard patterns to register listeners that match multiple related events.

```ts
import { Spark } from 'spark'

//→ Define event types
type Events = {
	'user.*': string
	'admin.*': string
}

//→ Create a new Spark instance with event typing
const spark = new Spark<Events>()

//→ Register a listener for all user-related events
spark.on('user.*', (msg) => {
	console.log(`User event: ${msg}`)
})

//→ Emit the "user.login" event
spark.emit('user.login', 'User logged in')

//→ Emit the "user.logout" event
spark.emit('user.logout', 'User logged out')

//→ Register a listener for all admin-related events
spark.on('admin.*', (msg) => {
	console.log(`Admin event: ${msg}`)
})

//→ Emit the "admin.create" event
spark.emit('admin.create', 'Admin created a new user')
```

### 4. Asynchronous Listeners

Use asynchronous listeners with the emit method, ensuring promises are handled correctly during event execution.

```ts
import { Spark } from 'spark'

//→ Define event types
type Events = {
	fetchData: string
}

//→ Create a new Spark instance with event typing
const spark = new Spark<Events>()

//→ Register an asynchronous listener for the "fetchData" event
spark.on('fetchData', async (url) => {
	const response = await fetch(url)
	const data = await response.json()
	console.log('Fetched data:', data)
})

//→ Emit the "fetchData" event with a URL
spark.emit('fetchData', 'https://jsonplaceholder.typicode.com/posts')
```

### 5. Dynamic Event Handling (No Typing)

Handle dynamic events with an untyped `Spark` instance for complete flexibility.

```ts
import { Spark } from 'spark'

//→ Create a new Spark instance without event typing
const spark = new Spark()

//→ Register a listener for any event
spark.on('dynamicEvent', (data: any) => {
	console.log(`Received data:`, data)
})

//→ Emit a dynamic event with any payload
spark.emit('dynamicEvent', { id: 1, name: 'Dynamic' })
```

### 6. Error Handling with Custom Error Listeners

Implement custom error listeners to handle errors emitted during event processing.

```ts
import { Spark } from 'spark'

//→ Define event types
type Events = {
	message: string
}

//→ Create a new Spark instance with event typing
const spark = new Spark<Events>()

//→ Register an error handler
spark.onError((event, error) => {
	console.error(`Error in event "${event}":`, error.message)
})

//→ Register a listener that throws an error
spark.on('message', () => {
	throw new Error('Something went wrong!')
})

//→ Emit the "message" event
spark.emit('message', 'Hello, World!')
```

---

## 📖 API Documentation

Spark provides a simple and intuitive API to manage events. Below is a detailed description of the available methods:

---

### 📝 on(event: string, listener: Listener): void

Registers a listener for the specified event.

-  **event**: The name of the event or a wildcard pattern (e.g., `user.*`).
-  **listener**: A function that will be called when the event is emitted.

**Example**:

```ts
spark.on('message', (msg) => {
	console.log(`Received message: ${msg}`)
})

spark.on('*', (event, ...args) => {
	console.log({ event, args })
})

spark.emit('message', 'This is a message')
```

---

### 🔄 once(event: string, listener: Listener, maxEmits: number = 1): void

Registers a one-time listener for the specified event. The listener will be removed after it is invoked the specified number of times.

-  **event**: The name of the event.
-  **listener**: A function that will be called when the event is emitted.
-  **maxEmits**: (Optional) The maximum number of times the listener can be called. Defaults to 1.

**Example**:

```ts
spark.once('error', (err) => {
	console.error(`Error occurred: ${err.message}`)
})
```

---

### ❌ off(event: string, listener?: Listener): void

Removes a listener from the specified event. If no listener is provided, all listeners for the event will be removed.

-  **event**: The name of the event.
-  **listener**: (Optional) The specific listener to remove.

**Example**:

```ts
spark.off('message', specificListener)
```

---

### 📤 emit(event: string, ...args: any[]): EmitResult | Promise<EmitResult>

Emits an event, invoking all matching listeners. Supports synchronous and asynchronous listeners.

-  **event**: The name of the event.
-  **args**: Arguments to pass to the listeners.
-  **Returns**: An `EmitResult` object indicating success or errors, or a `Promise<EmitResult>` if asynchronous listeners are present.

**Example**:

```ts
spark.emit('message', 'Hello, World!')
```

---

### 🧹 clear(event?: string): void

Clears all listeners for the specified event. If no event is provided, clears all listeners.

-  **event**: (Optional) The name of the event to clear.

**Example**:

```ts
spark.clear('message') // Clears all listeners for "message"
spark.clear() // Clears all listeners for all events
```

---

⚠️ onError(handler: ErrorListener): void

Registers an error handler to manage errors emitted during listener execution.

-  **handler**: A function that handles errors. It receives the event name and the error object.

**Example**:

```ts
spark.onError((event, error) => {
	console.error(`Error in event "${event}": ${error.message}`)
})
```

---

## 📚 Types

### Listener

A function that receives the event arguments. For wildcard events, the first argument is the event name.

```typescript
type Listener<T = any> = (...args: T[]) => void | Promise<void>
```

### EmitResult

Indicates the result of an `emit` call.

```ts
type EmitResult = {
	success: boolean
	errors?: Error[]
}
```

### ErrorListener

A function that handles errors during listener execution.

```ts
type ErrorListener = (event: string, error: Error) => void
```
