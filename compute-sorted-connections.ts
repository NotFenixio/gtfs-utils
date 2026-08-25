'use strict'

import type {ComputeSortedConnections} from './types.ts'

import createDebug from 'debug'
const debug = createDebug('gtfs-utils:compute-sorted-connections')
import {gte} from 'sorted-array-functions'

import inMemoryStore from './lib/in-memory-store.ts'
import readStopTimezones from './lib/read-stop-timezones.ts'
import readTrips from './read-trips.ts'
import readServicesAndExceptions from './read-services-and-exceptions.ts'
import computeConnections from './compute-connections.ts'
import resolveTime from './lib/resolve-time.ts'

const computeSortedConnections: ComputeSortedConnections = async (readFile, timezone, filters = {}, opt = {}) => {
	if ('string' !== typeof timezone || !timezone) {
		throw new Error('timezone must be a non-empty string.')
	}

	filters = {
		stop: () => true,
		...filters
	}

	const {
		createStore,
	} = {
		createStore: inMemoryStore,
		...opt,
	}

	debug('reading stops.stop_timezone')
	// stop.stop_id -> stop.stop_timezone || parent.stop_timezone
	const stopTimezones = await readStopTimezones(readFile, filters, createStore)

	debug('reading trips')
	const svcIdsRouteIdsByTrip = await readTrips(readFile, filters, {
		...opt,
		formatTrip: t => [t.service_id, t.route_id],
	})

	debug('reading services & exceptions')
	const _services = readServicesAndExceptions(readFile, timezone, filters)
	const services = createStore() // by service ID
	for await (const [id, dates] of _services) {
		await services.set(id, dates)
	}

	// todo: use store API to support memory-constrained environments
	const sortedConnections = []
	const compareConnections = (a, b) => a.departure - b.departure

	debug('reading connections')
	const connectionsByTrip = computeConnections(readFile, filters, opt)
	for await (const connections of connectionsByTrip) {
		if (connections.length === 0) continue

		const _ = await svcIdsRouteIdsByTrip.get(connections[0].tripId)
		if (!_) continue
		const [serviceId, routeId] = _
		const dates = await services.get(serviceId)
		if (!dates) continue // todo: log error?

		for (const c of connections) {
			for (let i = 0; i < dates.length; i++) {
				const fromTz = (await stopTimezones.get(c.fromStop)) || timezone
				const toTz = (await stopTimezones.get(c.toStop)) || timezone
				const newCon = {
					tripId: c.tripId,
					serviceId, routeId,
					fromStop: c.fromStop,
					departure: resolveTime(fromTz, dates[i], c.departure),
					toStop: c.toStop,
					arrival: resolveTime(toTz, dates[i], c.arrival),
					headwayBased: !!c.headwayBased,
				}

				const idx = gte(sortedConnections, newCon, compareConnections)
				if (idx === -1) sortedConnections.push(newCon)
				else sortedConnections.splice(idx, 0, newCon)
			}
		}
	}

	return sortedConnections
}

export default computeSortedConnections
