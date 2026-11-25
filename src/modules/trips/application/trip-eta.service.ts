import { Injectable, Logger } from '@nestjs/common';
import { GeoPoint, haversineMeters } from '../../../common/utils/geo';
import { GoogleDirectionsService } from '../../route-stops/infrastructure/external/google-directions.service';

// Fallback when Directions is unavailable: city driving ~25 km/h, and roads
// are ~1.4x longer than the straight line.
const FALLBACK_SPEED_MPS = 25_000 / 3600;
const ROAD_DETOUR_FACTOR = 1.4;

export interface EtaResult {
  /** Cumulative seconds from `origin` to each waypoint, in order. */
  waypointSeconds: number[];
  /** Cumulative seconds to the destination, or null if none was given. */
  destinationSeconds: number | null;
  source: 'directions' | 'estimate';
}

/**
 * Live ETAs along a trip's remaining stops. One Directions request covers
 * every remaining stop (waypoints in visiting order), so the caller only has
 * to throttle per trip, not per stop.
 */
@Injectable()
export class TripEtaService {
  private readonly logger = new Logger(TripEtaService.name);

  constructor(private readonly directions: GoogleDirectionsService) {}

  async compute(
    origin: GeoPoint,
    waypoints: GeoPoint[],
    destination: GeoPoint | null,
  ): Promise<EtaResult> {
    // Directions needs a destination: without one, the last stop is it.
    const points = destination ? waypoints : waypoints.slice(0, -1);
    const end = destination ?? waypoints[waypoints.length - 1];
    if (!end) {
      return {
        waypointSeconds: [],
        destinationSeconds: null,
        source: 'estimate',
      };
    }

    try {
      const { legSeconds } = await this.directions.getLegDurations(
        origin,
        end,
        points,
      );
      const cumulative = this.accumulate(legSeconds);
      return destination
        ? {
            waypointSeconds: cumulative.slice(0, waypoints.length),
            destinationSeconds: cumulative[cumulative.length - 1] ?? 0,
            source: 'directions',
          }
        : {
            waypointSeconds: cumulative,
            destinationSeconds: null,
            source: 'directions',
          };
    } catch (error) {
      this.logger.warn(
        `Directions ETA failed, using straight-line estimate: ${(error as Error).message}`,
      );
      return this.estimate(origin, waypoints, destination);
    }
  }

  /** Straight-line estimate (also used directly in tests). */
  estimate(
    origin: GeoPoint,
    waypoints: GeoPoint[],
    destination: GeoPoint | null,
  ): EtaResult {
    const path = destination ? [...waypoints, destination] : waypoints;
    const legSeconds: number[] = [];
    let previous = origin;
    for (const point of path) {
      legSeconds.push(
        Math.round(
          (haversineMeters(previous, point) * ROAD_DETOUR_FACTOR) /
            FALLBACK_SPEED_MPS,
        ),
      );
      previous = point;
    }
    const cumulative = this.accumulate(legSeconds);
    return {
      waypointSeconds: cumulative.slice(0, waypoints.length),
      destinationSeconds: destination
        ? (cumulative[cumulative.length - 1] ?? 0)
        : null,
      source: 'estimate',
    };
  }

  private accumulate(legSeconds: number[]): number[] {
    let total = 0;
    return legSeconds.map((s) => (total += s));
  }
}
