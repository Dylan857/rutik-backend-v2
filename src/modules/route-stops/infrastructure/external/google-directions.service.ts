import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface DirectionsResult {
  waypointOrder: number[];
  polyline: string;
  distanceMeters: number;
  durationSeconds: number;
}

interface DirectionsApiLeg {
  distance: { value: number };
  duration: { value: number };
}

interface DirectionsApiRoute {
  legs: DirectionsApiLeg[];
  overview_polyline: { points: string };
  waypoint_order: number[];
}

interface DirectionsApiResponse {
  status: string;
  routes: DirectionsApiRoute[];
  error_message?: string;
}

const DIRECTIONS_API_URL =
  'https://maps.googleapis.com/maps/api/directions/json';
const REQUEST_TIMEOUT_MS = 8000;

@Injectable()
export class GoogleDirectionsService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getOptimizedRoute(
    origin: LatLng,
    destination: LatLng,
    waypoints: LatLng[],
  ): Promise<DirectionsResult> {
    const apiKey = this.configService.get<string>('googleMaps.apiKey');

    const waypointsParam = waypoints.length
      ? `optimize:true|${waypoints.map((w) => `${w.lat},${w.lng}`).join('|')}`
      : undefined;

    const { data } = await firstValueFrom(
      this.httpService.get<DirectionsApiResponse>(DIRECTIONS_API_URL, {
        timeout: REQUEST_TIMEOUT_MS,
        params: {
          origin: `${origin.lat},${origin.lng}`,
          destination: `${destination.lat},${destination.lng}`,
          ...(waypointsParam ? { waypoints: waypointsParam } : {}),
          mode: 'driving',
          key: apiKey,
        },
      }),
    );

    if (data.status !== 'OK') {
      throw new Error(
        `Google Directions API returned status "${data.status}"${
          data.error_message ? `: ${data.error_message}` : ''
        }`,
      );
    }

    const route = data.routes[0];
    const distanceMeters = route.legs.reduce(
      (sum, leg) => sum + leg.distance.value,
      0,
    );
    const durationSeconds = route.legs.reduce(
      (sum, leg) => sum + leg.duration.value,
      0,
    );

    return {
      waypointOrder: route.waypoint_order,
      polyline: route.overview_polyline.points,
      distanceMeters,
      durationSeconds,
    };
  }
}
