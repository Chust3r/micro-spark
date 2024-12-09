import { describe, it, expect, vi } from 'vitest'
import { Pulse } from '../core/emitter'

describe('Pulse', () => {
	it('Should register and emit events', () => {
		const emitter = new Pulse()
		const listener = vi.fn()

		emitter.on('test', listener)
		emitter.emit('test', 'data')

		expect(listener).toHaveBeenCalledOnce()
		expect(listener).toHaveBeenCalledWith('data')
	})

	it('Should handle one-time listeners with a limit', () => {
		const emitter = new Pulse()
		const listener = vi.fn()

		emitter.once('test', listener, 2)
		emitter.emit('test', 'first')
		emitter.emit('test', 'second')
		emitter.emit('test', 'third')

		expect(listener).toHaveBeenCalledTimes(2)
		expect(listener).toHaveBeenNthCalledWith(1, 'first')
		expect(listener).toHaveBeenNthCalledWith(2, 'second')
	})

	it('Should match events with patterns', () => {
		const emitter = new Pulse()
		const listener = vi.fn()

		emitter.onPattern(/^user:.+$/, listener)
		emitter.emit('user:login', { userId: 1 })

		expect(listener).toHaveBeenCalledOnce()
		expect(listener).toHaveBeenCalledWith('user:login', { userId: 1 })
	})

	it('Should remove specific listeners', () => {
		const emitter = new Pulse()
		const listener = vi.fn()

		emitter.on('test', listener)
		emitter.off('test', listener)
		emitter.emit('test', 'data')

		expect(listener).not.toHaveBeenCalled()
	})

	it('Should remove all listeners for an event', () => {
		const emitter = new Pulse()
		const listener1 = vi.fn()
		const listener2 = vi.fn()

		emitter.on('test', listener1)
		emitter.on('test', listener2)
		emitter.off('test')
		emitter.emit('test', 'data')

		expect(listener1).not.toHaveBeenCalled()
		expect(listener2).not.toHaveBeenCalled()
	})

	it('Should handle error listeners', () => {
		const emitter = new Pulse()
		const errorListener = vi.fn()
		const faultyListener = vi.fn(() => {
			throw new Error('Test Error')
		})

		emitter.onError(errorListener)
		emitter.on('test', faultyListener)
		emitter.emit('test')

		expect(errorListener).toHaveBeenCalledOnce()
		expect(errorListener).toHaveBeenCalledWith('test', expect.any(Error))
	})

	it('Should clear all events', () => {
		const emitter = new Pulse()
		const listener1 = vi.fn()
		const listener2 = vi.fn()

		emitter.on('event1', listener1)
		emitter.on('event2', listener2)

		emitter.clear()

		emitter.emit('event1', 'data')
		emitter.emit('event2', 'data')

		expect(listener1).not.toHaveBeenCalled()
		expect(listener2).not.toHaveBeenCalled()
	})

	it('Should clear listeners for a specific event', () => {
		const emitter = new Pulse()
		const listener = vi.fn()

		emitter.on('test', listener)
		emitter.clear('test')
		emitter.emit('test', 'data')

		expect(listener).not.toHaveBeenCalled()
	})

	it('Should support wildcard events with patterns', () => {
		const emitter = new Pulse()
		const listener = vi.fn()

		emitter.onPattern('event:*', listener)
		emitter.emit('event:1', 'data1')
		emitter.emit('event:2', 'data2')

		expect(listener).toHaveBeenCalledTimes(2)
		expect(listener).toHaveBeenNthCalledWith(1, 'event:1', 'data1')
		expect(listener).toHaveBeenNthCalledWith(2, 'event:2', 'data2')
	})
})

describe('Pulse Advanced Tests', () => {
	it('Should handle multiple listeners with the same event', () => {
		const emitter = new Pulse()
		const listener1 = vi.fn()
		const listener2 = vi.fn()

		emitter.on('test', listener1)
		emitter.on('test', listener2)
		emitter.emit('test', 'data')

		expect(listener1).toHaveBeenCalledOnce()
		expect(listener1).toHaveBeenCalledWith('data')
		expect(listener2).toHaveBeenCalledOnce()
		expect(listener2).toHaveBeenCalledWith('data')
	})

	it('Should handle listeners for multiple events', () => {
		const emitter = new Pulse()
		const listener1 = vi.fn()
		const listener2 = vi.fn()

		emitter.on('test1', listener1)
		emitter.on('test2', listener2)
		emitter.emit('test1', 'data1')
		emitter.emit('test2', 'data2')

		expect(listener1).toHaveBeenCalledOnce()
		expect(listener1).toHaveBeenCalledWith('data1')
		expect(listener2).toHaveBeenCalledOnce()
		expect(listener2).toHaveBeenCalledWith('data2')
	})

	it('Should not call listeners after being removed', () => {
		const emitter = new Pulse()
		const listener = vi.fn()

		emitter.on('test', listener)
		emitter.off('test', listener)
		emitter.emit('test', 'data')

		expect(listener).not.toHaveBeenCalled()
	})

	it('Should handle multiple listeners for wildcard events', () => {
		const emitter = new Pulse()
		const listener1 = vi.fn()
		const listener2 = vi.fn()

		emitter.onPattern('event:*', listener1)
		emitter.onPattern('event:*', listener2)
		emitter.emit('event:1', 'data1')
		emitter.emit('event:2', 'data2')

		expect(listener1).toHaveBeenCalledTimes(2)
		expect(listener1).toHaveBeenNthCalledWith(1, 'event:1', 'data1')
		expect(listener1).toHaveBeenNthCalledWith(2, 'event:2', 'data2')
		expect(listener2).toHaveBeenCalledTimes(2)
		expect(listener2).toHaveBeenNthCalledWith(1, 'event:1', 'data1')
		expect(listener2).toHaveBeenNthCalledWith(2, 'event:2', 'data2')
	})

	it('Should support emitting multiple events at once', () => {
		const emitter = new Pulse()
		const listener1 = vi.fn()
		const listener2 = vi.fn()

		emitter.on('test1', listener1)
		emitter.on('test2', listener2)
		emitter.emit('test1', 'data1', 'extra1')
		emitter.emit('test2', 'data2', 'extra2')

		expect(listener1).toHaveBeenCalledOnce()
		expect(listener1).toHaveBeenCalledWith('data1', 'extra1')
		expect(listener2).toHaveBeenCalledOnce()
		expect(listener2).toHaveBeenCalledWith('data2', 'extra2')
	})
})
