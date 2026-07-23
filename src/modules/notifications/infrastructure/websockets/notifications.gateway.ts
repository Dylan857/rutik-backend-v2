import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../../../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../../user/domain/enums/user-role.enum';
import { NotificationResponseDto } from '../api/dto/notification-response.dto';

// @WebSocketGateway() decorator options are read at class-decoration time,
// before ConfigService exists — mirrors the CORS_ORIGIN parsing in app.config.ts directly.
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:4200')
      .split(',')
      .map((o) => o.trim()),
  },
})
export class NotificationsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  private readonly server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  handleConnection(client: Socket): void {
    const token = client.handshake.auth?.token as string | undefined;

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('jwt.secret', 'fallback'),
      });

      if (!payload.companyId || payload.role !== UserRole.ADMIN) {
        client.disconnect();
        return;
      }

      void client.join(`company:${payload.companyId}`);
    } catch {
      this.logger.warn(`Rejected socket connection: invalid token`);
      client.disconnect();
    }
  }

  emitToCompany(
    companyId: string,
    notification: NotificationResponseDto,
  ): void {
    this.server
      .to(`company:${companyId}`)
      .emit('notification:new', notification);
  }
}
