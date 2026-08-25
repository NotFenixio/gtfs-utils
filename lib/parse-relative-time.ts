'use strict'

import parseTime from '../parse-time.ts'

const parseRelativeTime = (str) => {
	const t = parseTime(str)
	return t.hours * 3600 + t.minutes * 60 + (t.seconds || 0)
}

export default parseRelativeTime
