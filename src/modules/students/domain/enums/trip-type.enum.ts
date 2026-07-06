// Which leg(s) of the route a student needs. Most students need both, but
// some are only dropped at school (never picked up for the return) or only
// picked up at school for the return (someone else brings them in the morning).
export enum TripType {
  ROUND_TRIP = 'ROUND_TRIP',
  PICKUP_ONLY = 'PICKUP_ONLY',
  DROPOFF_ONLY = 'DROPOFF_ONLY',
}
