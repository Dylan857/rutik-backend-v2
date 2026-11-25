import { forwardRef, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../../../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../../user/domain/enums/user-role.enum';
import { TripsService } from '../../application/trips.service';

export const TRIP_EVENTS = {
  STARTED: 'trip:started',
  LOCATION: 'trip:location',
  ETA: 'trip:eta',
  STOP_UPDATED: 'trip:stop-updated',
  FINISHED: 'trip:finished',
} as const;

const tripRoom = (tripId: string): string => `trip:${tripId}`;
const companyRoom = (companyId: string): string => `company:${companyId}`;

/**
 * Live trip tracking. Admins join their company room on connect and see
 * every trip; guardians (and admins, for one trip) send `trip:join` and
 * are checked against the trip before being let into its room.
 *
 * Trip rooms only get anonymous stop updates (sequence/status, no names or
 * home coordinates of other families); the company room gets full detail.
 */
@WebSocketGateway({
  namespace: '/tracking',
  cors: {
    // Mobile clients send no Origin; browsers are limited to the panel.
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:4200')
      .split(',')
      .map((o) => o.trim()),
  },
})
export class TrackingGateway implements OnGatewayConnection {
  private readonly logger = new Logger(TrackingGateway.name);

  @WebSocketServer()
  private readonly server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => TripsService))
    private readonly tripsService: TripsService,
  ) {}

  handleConnection(client: Socket): void {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const user = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('jwt.secret', 'fallback'),
      });
      client.data.user = user;
      if (user.role === UserRole.ADMIN && user.companyId) {
        void client.join(companyRoom(user.companyId));
      }
    } catch {
      this.logger.warn('Rejected tracking socket: invalid token');
      client.disconnect();
    }
  }

  @SubscribeMessage('trip:join')
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { tripId?: string },
  ): Promise<{ ok: boolean }> {
    const user = client.data.user as JwtPayload | undefined;
    if (!user || !body?.tripId) return { ok: false };

    const allowed = await this.tripsService
      .canWatch(user, body.tripId)
      .catch(() => false);
    if (allowed) await client.join(tripRoom(body.tripId));
    return { ok: allowed };
  }

  @SubscribeMessage('trip:leave')
  async leave(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { tripId?: string },
  ): Promise<{ ok: boolean }> {
    if (body?.tripId) await client.leave(tripRoom(body.tripId));
    return { ok: true };
  }

  /** Same payload to the trip's watchers and the company's admins. */
  emitToTrip(
    companyId: string,
    tripId: string,
    event: string,
    payload: unknown,
  ): void {
    this.server
      .to(tripRoom(tripId))
      .to(companyRoom(companyId))
      .emit(event, payload);
  }

  /** Different payloads: a public one for the trip room, a full one for admins. */
  emitSplit(
    companyId: string,
    tripId: string,
    event: string,
    publicPayload: unknown,
    adminPayload: unknown,
  ): void {
    this.server
      .to(tripRoom(tripId))
      .except(companyRoom(companyId))
      .emit(event, publicPayload);
    this.server.to(companyRoom(companyId)).emit(event, adminPayload);
  }

  emitToCompany(companyId: string, event: string, payload: unknown): void {
    this.server.to(companyRoom(companyId)).emit(event, payload);
  }
}
