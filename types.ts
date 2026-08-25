export type GtfsId = string
export type UnixTimestamp = number
export type GtfsDate = string
export type Timezone = string

export interface GtfsRow {
	readonly [field: string]: string | undefined
}

export interface StopRow extends GtfsRow {
	stop_id: GtfsId
	stop_name?: string
	stop_lat?: string
	stop_lon?: string
	location_type?: string
	parent_station?: GtfsId
	stop_timezone?: Timezone
}

export interface TripRow extends GtfsRow {
	route_id: GtfsId
	service_id: GtfsId
	trip_id: GtfsId
	shape_id?: GtfsId
}

export interface StopTimeRow extends GtfsRow {
	trip_id: GtfsId
	arrival_time?: string
	departure_time?: string
	stop_id: GtfsId
	stop_sequence: string
}

export interface FrequencyRow extends GtfsRow {
	trip_id: GtfsId
	start_time: string
	end_time: string
	headway_secs: string
	exact_times?: string
}

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

export interface CalendarDateRow extends GtfsRow {
	service_id: GtfsId
	date: GtfsDate
	exception_type: string
}

export interface ShapeRow extends GtfsRow {
	shape_id: GtfsId
	shape_pt_lat: string
	shape_pt_lon: string
	shape_pt_sequence: string
	shape_dist_traveled?: string
}

export type ReadFile = (name: string) => AsyncIterable<GtfsRow> | Promise<AsyncIterable<GtfsRow>>
export type Filter<T> = (value: T) => boolean

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

export type CreateStore = <Key extends string = string, Value = unknown>() => Store<Key, Value>

export interface Stop extends StopRow {
	stops?: GtfsId[]
	entrances?: GtfsId[]
	boardingAreas?: GtfsId[]
}

export interface ParsedTime {
	hours: number
	minutes: number
	seconds: number | null
}

export interface Connection {
	tripId: GtfsId
	fromStop: GtfsId
	departure: number
	toStop: GtfsId
	arrival: number
	headwayBased: boolean
}

export interface SortedConnection extends Connection {
	serviceId: GtfsId
	routeId: GtfsId
}

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

export type ServiceWithExceptions = [GtfsId, UnixTimestamp[], Service, number[], UnixTimestamp[]]

export interface ShapePoint {
	shape_pt_lat: number
	shape_pt_lon: number
	shape_pt_sequence: number
	shape_dist_traveled: number
}

export interface ReadStopsFilters {stop?: Filter<StopRow>}
export interface ReadTripsFilters {trip?: Filter<TripRow>}
export interface StopTimesFilters extends ReadTripsFilters {
	stopTime?: Filter<StopTimeRow>
	frequenciesRow?: Filter<FrequencyRow>
}
export interface ServicesFilters {
	service?: Filter<CalendarRow>
	serviceException?: Filter<CalendarDateRow>
}
export interface ShapesFilters {shapesRow?: Filter<ShapeRow>}

export interface StoreOptions {
	createStore?: CreateStore
}

export type ReadCsv = (path: string | AsyncIterable<Uint8Array>) => Promise<AsyncIterable<GtfsRow>>
export type ParseTime = (value: string) => ParsedTime
export type ParseDate = (value: GtfsDate, timezone?: Timezone) => UnixTimestamp
export type FormatDate = (timestamp: UnixTimestamp, timezone: Timezone) => GtfsDate
export type ReadStops = (readFile: ReadFile, filters?: ReadStopsFilters, options?: StoreOptions) => Promise<Store<GtfsId, Stop>>
export type ReadTrips<Value = TripRow> = (
	readFile: ReadFile,
	filters?: ReadTripsFilters,
	options?: StoreOptions & {formatTrip?: (trip: TripRow) => Value},
) => Promise<Store<GtfsId, Value>>
export type ReadShapes = (readFile: ReadFile, filters?: ShapesFilters) => AsyncGenerator<[GtfsId, ShapePoint[]]>
export type ReadServicesAndExceptions = (
	readFile: ReadFile,
	timezone: Timezone,
	filters?: ServicesFilters,
	options?: {exposeStats?: boolean, weekdaysMap?: Map<UnixTimestamp, number>},
) => AsyncGenerator<ServiceWithExceptions>
export type ComputeConnections = (readFile: ReadFile, filters?: StopTimesFilters, options?: object) => AsyncGenerator<Connection[]>
export type ComputeSchedules = (readFile: ReadFile, filters?: StopTimesFilters, options?: StoreOptions & {computeSig?: (data: unknown) => string}) => Promise<Store<string, Schedule>>
export type ComputeSortedConnections = (
	readFile: ReadFile,
	timezone: Timezone,
	filters?: StopTimesFilters & ServicesFilters & ReadTripsFilters,
	options?: StoreOptions,
) => Promise<SortedConnection[]>
export type ComputeStopovers = (
	readFile: ReadFile,
	timezone: Timezone,
	filters?: StopTimesFilters & ServicesFilters & ReadTripsFilters & ReadStopsFilters,
	options?: StoreOptions,
) => AsyncGenerator<Stopover>
export type ComputeServiceBreaks = (
	connections: readonly SortedConnection[],
	options?: StoreOptions & {minLength?: number},
) => AsyncGenerator<{fromStop: GtfsId, toStop: GtfsId, start: number, end: number, duration: number, routeId: GtfsId, serviceId: GtfsId}>

export interface PathwayRow extends GtfsRow {
	pathway_id: GtfsId
	from_stop_id: GtfsId
	to_stop_id: GtfsId
	is_bidirectional?: string
}

export interface PathwayNode {
	id: GtfsId
	connectedTo: Record<GtfsId, Record<GtfsId, [PathwayRow, PathwayNode]>>
}

export interface ReadPathwaysFilters {
	pathway?: Filter<PathwayRow>
	stop?: Filter<StopRow>
}

export type ReadPathways = (
	readFile: ReadFile,
	filters?: ReadPathwaysFilters,
	options?: StoreOptions,
) => AsyncGenerator<[GtfsId, PathwayNode, Record<GtfsId, PathwayNode>]>

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

export type ComputeTrajectories = (
	readFile: ReadFile,
	filters?: ReadStopsFilters & ReadTripsFilters & ShapesFilters & StopTimesFilters,
	options?: StoreOptions,
) => AsyncGenerator<Trajectory>

export type OptimiseServicesAndExceptions = (
	readFile: ReadFile,
	timezone: Timezone,
	filters?: ServicesFilters,
	options?: {weekdaysMap?: Map<UnixTimestamp, number>},
) => AsyncGenerator<[GtfsId, CalendarRow | null, CalendarDateRow[]]>

export interface AlternativeTrip {
	tripId: GtfsId
	serviceId: GtfsId
	routeId: GtfsId
	departure: UnixTimestamp
	arrival: UnixTimestamp
}

export type FindAlternativeTrips = (
	readFile: ReadFile,
	timezone: Timezone,
	services: Store<GtfsId, UnixTimestamp[]>,
	schedules: Store<string, Schedule>,
) => (fromStopId: GtfsId, departure: UnixTimestamp, toStopId: GtfsId, arrival: UnixTimestamp) => AsyncGenerator<AlternativeTrip[]>

export interface RouteType {
	gtfs: number
	fptf: string | null
}

export type ExtendedToBasic = (extendedType: number) => number | null
export type GtfsToFptf = (gtfsType: number) => string | null
export type FptfToGtfs = (fptfMode: string) => number | null