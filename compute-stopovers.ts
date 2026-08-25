/** Computes GTFS stopovers with absolute arrival and departure times. @module */
'use strict'

import type {ComputeStopovers} from './types.ts'

import createDebug from 'debug'
const debug = createDebug('gtfs-utils:compute-stopover-times')

import inMemoryStore from './lib/in-memory-store.ts'
import readStopTimezones from './lib/read-stop-timezones.ts'
import readTrips from './read-trips.ts'
import readStopTimes from './lib/read-stop-times.ts'
import readServicesAndExceptions from './read-services-and-exceptions.ts'
import resolveTime from './lib/resolve-time.ts'

/** Yields dated stopovers for all matching GTFS trips. */
const computeStopovers: ComputeStopovers = async function* (readFile, timezone, filters = {}, opt = {}) {
	if ('function' !== typeof readFile) {
		throw new Error('readFile must be a function.')
	}

	if ('string' !== typeof timezone || !timezone) {
		throw new Error('timezone must be a non-empty string.')
	}

	filters = {
		stop: () => true,
		trip: () => true,
		service: () => true,
		serviceException: () => true,
		stopTime: () => true,
		frequenciesRow: () => true,
		...filters,
	}
	if ('function' !== typeof filters.trip) {
		throw new Error('filters.trip must be a function.')
	}
	if ('function' !== typeof filters.service) {
		throw new Error('filters.service must be a function.')
	}
	if ('function' !== typeof filters.serviceException) {
		throw new Error('filters.serviceException must be a function.')
	}
	if ('function' !== typeof filters.stopTime) {
		throw new Error('filters.stopTime must be a function.')
	}
	if ('function' !== typeof filters.frequenciesRow) {
		throw new Error('filters.frequenciesRow must be a function.')
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

	debug('reading services & exceptions')
	const _services = readServicesAndExceptions(readFile, timezone, filters)
	const services = createStore() // by service ID
	for await (const [id, dates] of _services) {
		await services.set(id, dates)
	}

	debug('reading stop times')
	for await (const _ of readStopTimes(readFile, filters)) {
		const {
			tripId, routeId, serviceId, shapeId,
			stops, arrivals: arrs, departures: deps,
			headwayBasedStarts: hwStarts,
			headwayBasedEnds: hwEnds,
			headwayBasedHeadways: hwHeadways,
		} = _

		const dates = await services.get(serviceId)
		if (!dates) {
			// todo: debug-log
			continue
		}

		for (const date of dates) {
			// schedule-based
			for (let i = 0; i < stops.length; i++) {
				const stopId = stops[i]
				const tz = (await stopTimezones.get(stopId)) || timezone
				yield {
					stop_id: stopId,
					trip_id: tripId,
					service_id: serviceId,
					route_id: routeId,
					shape_id: shapeId,
					start_of_trip: date,
					arrival: resolveTime(tz, date, arrs[i]),
					departure: resolveTime(tz, date, deps[i]),
				}
			}

			// headway-based
			// todo: DRY with compute-connections
			const t0 = arrs[0]
			const hwStartsL = hwStarts ? hwStarts.length : 0
			for (let h = 0; h < hwStartsL; h++) {
				for (let t = hwStarts[h]; t < hwEnds[h]; t += hwHeadways[h]) {
					for (let i = 0; i < stops.length; i++) {
						const tz = (await stopTimezones.get(stops[i])) || timezone
						const arr = t + arrs[i] - t0
						const dep = t + deps[i] - t0
						yield {
							stop_id: stops[i],
							trip_id: tripId,
							service_id: serviceId,
							route_id: routeId,
							shape_id: shapeId,
							start_of_trip: date,
							arrival: resolveTime(tz, date, arr),
							departure: resolveTime(tz, date, dep),
							headwayBased: true,
						}
					}
				}
			}
		}
	}
}

export default computeStopovers
