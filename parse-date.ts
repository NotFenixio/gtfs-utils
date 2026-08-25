/** Parses GTFS dates into Unix timestamps. @module */
'use strict'

import type {ParseDate} from './types.ts'

import LRUCache from 'quick-lru'
import {zonedTimeToUtc} from 'date-fns-tz'

const dateFormat = /^\d{8}$/

const cache = new LRUCache({maxSize: 200})

/** Parses a YYYYMMDD GTFS date in an optional timezone. */
const parseDate: ParseDate = (str, timezone) => {
	if ('string' !== typeof str) throw new Error('str must be a string.')
	if (!dateFormat.test(str)) throw new Error('str must be YYYYMMDD.')
	if ('string' !== typeof timezone || !timezone) {
		throw new Error('timezone must be a non-empty string.')
	}

	const signature = str + '-' + timezone
	if (cache.has(signature)) return cache.get(signature)

	const isoDate = [
		str.substr(0, 4),
		str.substr(4, 2),
		str.substr(6, 2)
	].join('-')
	const millis = +zonedTimeToUtc(isoDate + ' 00:00', timezone)
	const t = millis / 1000 | 0 // make UNIX timestamp

	cache.set(signature, t)
	return t
}

export default parseDate
