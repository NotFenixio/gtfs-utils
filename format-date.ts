'use strict'

import type {FormatDate} from './types.ts'

import {DateTime} from 'luxon'

const formatDate: FormatDate = (t, timezone) => {
	if ('number' !== typeof t) {
		throw new Error('millis must be a number.')
	}
	if ('string' !== typeof timezone || !timezone) {
		throw new Error('timezone must be a non-empty string.')
	}

	return DateTime.fromMillis(t * 1000, {
		zone: timezone
	}).toFormat('yyyyMMdd')
}

export default formatDate
