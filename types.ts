/** Shared TypeScript contracts for the GTFS utility entrypoints. @module */

/** Identifier used by a GTFS entity. */
export type GtfsId = string
/** Unix timestamp in milliseconds. */
export type UnixTimestamp = number
/** Date encoded in the GTFS YYYYMMDD format. */
export type GtfsDate = string
/** IANA timezone name used to resolve GTFS local times. */
export type Timezone = string

/** Raw row read from a GTFS CSV file. */
export interface GtfsRow {
	readonly [field: string]: string | undefined
}

/** Row from stops.txt. */
export interface StopRow extends GtfsRow {
	stop_id: GtfsId
	stop_name?: string
	stop_lat?: string
	stop_lon?: string
	location_type?: string
	parent_station?: GtfsId
	stop_timezone?: Timezone
}

/** Row from trips.txt. */
export interface TripRow extends GtfsRow {
	route_id: GtfsId
	service_id: GtfsId
	trip_id: GtfsId
	shape_id?: GtfsId
}

/** Row from stop_times.txt. */
export interface StopTimeRow extends GtfsRow {
	trip_id: GtfsId
	arrival_time?: string
	departure_time?: string
	stop_id: GtfsId
	stop_sequence: string
}

/** Row from frequencies.txt. */
export interface FrequencyRow extends GtfsRow {
	trip_id: GtfsId
	start_time: string
	end_time: string
	headway_secs: string
	exact_times?: string
}

/** Row from calendar.txt. */
export interface CalendarRow extends GtfsRow {
	service_id: GtfsId
	monday: string
	tuesday: string
	wednesday: string
	thursday: string
	friday: string
	saturday: string
	sunday: string
	start_date: GtfsDate
	end_date: GtfsDate
}

/** Row from calendar_dates.txt. */
export interface CalendarDateRow extends GtfsRow {
	service_id: GtfsId
	date: GtfsDate
	exception_type: string
}

/** Row from shapes.txt. */
export interface ShapeRow extends GtfsRow {
	shape_id: GtfsId
	shape_pt_lat: string
	shape_pt_lon: string
	shape_pt_sequence: string
	shape_dist_traveled?: string
}

/** Supplies rows from a named GTFS table. */
export type ReadFile = (name: string) => AsyncIterable<GtfsRow> | Promise<AsyncIterable<GtfsRow>>
/** Predicate used to retain matching GTFS rows. */
export type Filter<T> = (value: T) => boolean

/** Asynchronous key-value store used by the processing APIs. */
export interface Store<Key extends string = string, Value = unknown> extends AsyncIterable<[Key, Value]> {
	has(key: Key): Promise<boolean>
	get(key: Key): Promise<Value | null>
	set(key: Key, value: Value): Promise<void>
	delete(key: Key): Promise<void>
	map(key: Key, callback: (value: Value | undefined, key: Key) => Value | null | undefined): Promise<void>
	entries(): AsyncIterable<[Key, Value]>
	keys(): AsyncIterable<Key>
	values(): AsyncIterable<Value>
	close(): Promise<void>
}

/** Factory for an asynchronous key-value store. */
export type CreateStore = <Key extends string = string, Value = unknown>() => Store<Key, Value>

/** Stop row enriched with child location IDs when it is a station. */
export interface Stop extends StopRow {
	stops?: GtfsId[]
	entrances?: GtfsId[]
	boardingAreas?: GtfsId[]
}

/** Parsed GTFS wall-clock time components. */
export interface ParsedTime {
	hours: number
	minutes: number
	seconds: number | null
}

/** A movement between two consecutive stops in a trip. */
export interface Connection {
	tripId: GtfsId
	fromStop: GtfsId
	departure: number
	toStop: GtfsId
	arrival: number
	headwayBased: boolean
}

/** A dated connection augmented with route and service IDs. */
export interface SortedConnection extends Connection {
	serviceId: GtfsId
	routeId: GtfsId
}

/** A group of trips that share the same stop-time pattern. */
export interface Schedule {
	id: string
	trips: Array<{tripId: GtfsId, start: number}>
	stops: GtfsId[]
	arrivals: Array<number | null>
	departures: Array<number | null>
	headwayBasedStarts: number[]
	headwayBasedEnds: number[]
	headwayBasedHeadways: number[]
}

/** A dated arrival and departure at one stop. */
export interface Stopover {
	stop_id: GtfsId
	trip_id: GtfsId
	service_id: GtfsId
	route_id: GtfsId
	shape_id?: GtfsId
	start_of_trip: UnixTimestamp
	arrival: UnixTimestamp | null
	departure: UnixTimestamp | null
	headwayBased?: boolean
}

/** GTFS calendar service with its active weekdays and date range. */
export interface Service {
	service_id: GtfsId
	monday: string
	tuesday: string
	wednesday: string
	thursday: string
	friday: string
	saturday: string
	sunday: string
	start_date: GtfsDate | null
	end_date: GtfsDate | null
}

/** Service ID, active dates, calendar row, weekday counts, and removed dates. */
export type ServiceWithExceptions = [GtfsId, UnixTimestamp[], Service, number[], UnixTimestamp[]]

/** A parsed coordinate from shapes.txt. */
export interface ShapePoint {
	shape_pt_lat: number
	shape_pt_lon: number
	shape_pt_sequence: number
	shape_dist_traveled: number
}

/** Filters accepted by read-stops. */
export interface ReadStopsFilters {stop?: Filter<StopRow>}
/** Filters accepted by read-trips. */
export interface ReadTripsFilters {trip?: Filter<TripRow>}
/** Filters accepted by stop-time computations. */
export interface StopTimesFilters extends ReadTripsFilters {
	stopTime?: Filter<StopTimeRow>
	frequenciesRow?: Filter<FrequencyRow>
}
/** Filters accepted by service calendar readers. */
export interface ServicesFilters {
	service?: Filter<CalendarRow>
	serviceException?: Filter<CalendarDateRow>
}
/** Filters accepted by read-shapes. */
export interface ShapesFilters {shapesRow?: Filter<ShapeRow>}

/** Options shared by APIs that construct a store. */
export interface StoreOptions {
	createStore?: CreateStore
}

/** Signature of the read-csv entrypoint. */
export type ReadCsv = (path: string | AsyncIterable<Uint8Array>) => Promise<AsyncIterable<GtfsRow>>
/** Signature of the parse-time entrypoint. */
export type ParseTime = (value: string) => ParsedTime
/** Signature of the parse-date entrypoint. */
export type ParseDate = (value: GtfsDate, timezone?: Timezone) => UnixTimestamp
/** Signature of the format-date entrypoint. */
export type FormatDate = (timestamp: UnixTimestamp, timezone: Timezone) => GtfsDate
/** Signature of the read-stops entrypoint. */
export type ReadStops = (readFile: ReadFile, filters?: ReadStopsFilters, options?: StoreOptions) => Promise<Store<GtfsId, Stop>>
/** Signature of the read-trips entrypoint. */
export type ReadTrips<Value = TripRow> = (
	readFile: ReadFile,
	filters?: ReadTripsFilters,
	options?: StoreOptions & {formatTrip?: (trip: TripRow) => Value},
) => Promise<Store<GtfsId, Value>>
/** Signature of the read-shapes entrypoint. */
export type ReadShapes = (readFile: ReadFile, filters?: ShapesFilters) => AsyncGenerator<[GtfsId, ShapePoint[]]>
/** Signature of the read-services-and-exceptions entrypoint. */
export type ReadServicesAndExceptions = (
	readFile: ReadFile,
	timezone: Timezone,
	filters?: ServicesFilters,
	options?: {exposeStats?: boolean, weekdaysMap?: Map<UnixTimestamp, number>},
) => AsyncGenerator<ServiceWithExceptions>
/** Signature of the compute-connections entrypoint. */
export type ComputeConnections = (readFile: ReadFile, filters?: StopTimesFilters, options?: object) => AsyncGenerator<Connection[]>
/** Signature of the compute-schedules entrypoint. */
export type ComputeSchedules = (readFile: ReadFile, filters?: StopTimesFilters, options?: StoreOptions & {computeSig?: (data: unknown) => string}) => Promise<Store<string, Schedule>>
/** Signature of the compute-sorted-connections entrypoint. */
export type ComputeSortedConnections = (
	readFile: ReadFile,
	timezone: Timezone,
	filters?: StopTimesFilters & ServicesFilters & ReadTripsFilters,
	options?: StoreOptions,
) => Promise<SortedConnection[]>
/** Signature of the compute-stopovers entrypoint. */
export type ComputeStopovers = (
	readFile: ReadFile,
	timezone: Timezone,
	filters?: StopTimesFilters & ServicesFilters & ReadTripsFilters & ReadStopsFilters,
	options?: StoreOptions,
) => AsyncGenerator<Stopover>
/** Signature of the compute-service-breaks entrypoint. */
export type ComputeServiceBreaks = (
	connections: readonly SortedConnection[],
	options?: StoreOptions & {minLength?: number},
) => AsyncGenerator<{fromStop: GtfsId, toStop: GtfsId, start: number, end: number, duration: number, routeId: GtfsId, serviceId: GtfsId}>

/** Row from pathways.txt. */
export interface PathwayRow extends GtfsRow {
	pathway_id: GtfsId
	from_stop_id: GtfsId
	to_stop_id: GtfsId
	is_bidirectional?: string
}

/** A node in a station pathway graph. */
export interface PathwayNode {
	id: GtfsId
	connectedTo: Record<GtfsId, Record<GtfsId, [PathwayRow, PathwayNode]>>
}

/** Filters accepted by read-pathways. */
export interface ReadPathwaysFilters {
	pathway?: Filter<PathwayRow>
	stop?: Filter<StopRow>
}

/** Signature of the read-pathways entrypoint. */
export type ReadPathways = (
	readFile: ReadFile,
	filters?: ReadPathwaysFilters,
	options?: StoreOptions,
) => AsyncGenerator<[GtfsId, PathwayNode, Record<GtfsId, PathwayNode>]>

/** GeoJSON feature describing one trip's path. */
export interface Trajectory {
	type: 'Feature'
	geometry: {type: 'LineString', coordinates: Array<[number, number]>}
	properties: {
		id?: string
		tripId?: GtfsId
		serviceId?: GtfsId
		[key: string]: unknown
	}
}

/** Signature of the compute-trajectories entrypoint. */
export type ComputeTrajectories = (
	readFile: ReadFile,
	filters?: ReadStopsFilters & ReadTripsFilters & ShapesFilters & StopTimesFilters,
	options?: StoreOptions,
) => AsyncGenerator<Trajectory>

/** Signature of the optimise-services-and-exceptions entrypoint. */
export type OptimiseServicesAndExceptions = (
	readFile: ReadFile,
	timezone: Timezone,
	filters?: ServicesFilters,
	options?: {weekdaysMap?: Map<UnixTimestamp, number>},
) => AsyncGenerator<[GtfsId, CalendarRow | null, CalendarDateRow[]]>

/** A trip returned by an alternative-trip search. */
export interface AlternativeTrip {
	tripId: GtfsId
	serviceId: GtfsId
	routeId: GtfsId
	departure: UnixTimestamp
	arrival: UnixTimestamp
}

/** Signature of the find-alternative-trips entrypoint. */
export type FindAlternativeTrips = (
	readFile: ReadFile,
	timezone: Timezone,
	services: Store<GtfsId, UnixTimestamp[]>,
	schedules: Store<string, Schedule>,
) => (fromStopId: GtfsId, departure: UnixTimestamp, toStopId: GtfsId, arrival: UnixTimestamp) => AsyncGenerator<AlternativeTrip[]>

/** A mapping between a GTFS route type and an FPTF mode. */
export interface RouteType {
	gtfs: number
	fptf: string | null
}

/** Converts an extended GTFS route type to its basic equivalent. */
export type ExtendedToBasic = (extendedType: number) => number | null
/** Converts a GTFS route type to an FPTF mode. */
export type GtfsToFptf = (gtfsType: number) => string | null
/** Converts an FPTF mode to a GTFS route type. */
export type FptfToGtfs = (fptfMode: string) => number | null