import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from '../../notifications/application/notifications.service';
import { NotificationSeverity } from '../../notifications/domain/enums/notification-severity.enum';
import { NotificationSourceType } from '../../notifications/domain/enums/notification-source-type.enum';
import { NotificationType } from '../../notifications/domain/enums/notification-type.enum';
import { PushNotificationsService } from '../../push-notifications/application/push-notifications.service';
import { TripLeg, TripStopStatus } from '../domain/enums/trip.enums';
import { RouteTrip } from '../domain/route-trip.entity';
import { TripStop } from '../domain/trip-stop.entity';

/** `data.type` of the pushes, read by the mobile app to route a tap. */
export const TRIP_PUSH_TYPES = {
  STARTED: 'TRIP_STARTED',
  APPROACHING: 'TRIP_APPROACHING',
  ARRIVED: 'TRIP_ARRIVED',
  STOP_RESOLVED: 'TRIP_STOP_RESOLVED',
  FINISHED: 'TRIP_FINISHED',
} as const;

const firstName = (fullName: string): string =>
  fullName.split(' ')[0] || fullName;
const legLabel = (leg: TripLeg): string =>
  leg === TripLeg.PICKUP ? 'ida' : 'regreso';

/**
 * Every outbound message about a trip: pushes to guardians' phones and
 * notifications in the admin panel's feed. Never throws — a failed push must
 * not break the driver's flow — so callers can fire and forget.
 */
@Injectable()
export class TripNotifier {
  private readonly logger = new Logger(TripNotifier.name);

  constructor(
    private readonly push: PushNotificationsService,
    private readonly notifications: NotificationsService,
  ) {}

  async started(trip: RouteTrip, stops: TripStop[]): Promise<void> {
    await Promise.all(
      stops.map((stop) =>
        this.pushToGuardians(trip, stop, TRIP_PUSH_TYPES.STARTED, {
          title:
            trip.leg === TripLeg.PICKUP
              ? 'La ruta inició'
              : 'Ruta de regreso en camino',
          body:
            trip.leg === TripLeg.PICKUP
              ? `${trip.driverName} va en camino a recoger a ${firstName(stop.studentName)}.`
              : `${firstName(stop.studentName)} va en camino a casa.`,
        }),
      ),
    );
    await this.adminNotification(trip, {
      type: NotificationType.ROUTE_STARTED,
      severity: NotificationSeverity.INFO,
      title: 'Ruta iniciada',
      message: `${trip.driverName} inició la ruta de ${legLabel(trip.leg)} de ${trip.schoolName} con ${stops.length} estudiante(s).`,
      dedupeKey: `trip:${trip.id}:started`,
    });
  }

  async approaching(
    trip: RouteTrip,
    stop: TripStop,
    minutes: number | null,
  ): Promise<void> {
    const name = firstName(stop.studentName);
    await this.pushToGuardians(trip, stop, TRIP_PUSH_TYPES.APPROACHING, {
      title: 'El bus está cerca',
      body:
        minutes != null && minutes > 0
          ? `Llega a la parada de ${name} en ~${minutes} min.`
          : `Está por llegar a la parada de ${name}.`,
    });
  }

  async arrived(trip: RouteTrip, stop: TripStop): Promise<void> {
    const name = firstName(stop.studentName);
    await this.pushToGuardians(trip, stop, TRIP_PUSH_TYPES.ARRIVED, {
      title: 'El bus llegó',
      body:
        trip.leg === TripLeg.PICKUP
          ? `El bus está en la parada de ${name}.`
          : `El bus llegó a casa con ${name}.`,
    });
  }

  async resolved(trip: RouteTrip, stop: TripStop): Promise<void> {
    const name = firstName(stop.studentName);
    const done = stop.status === TripStopStatus.DONE;
    const pickup = trip.leg === TripLeg.PICKUP;

    // Phrased so it reads right for any student (no gendered participles).
    await this.pushToGuardians(trip, stop, TRIP_PUSH_TYPES.STOP_RESOLVED, {
      title: done
        ? pickup
          ? 'Ya va en la ruta'
          : 'Entrega en casa'
        : pickup
          ? 'Sin recogida'
          : 'Sin entrega',
      body: done
        ? pickup
          ? `Recogimos a ${name}. Va camino a ${trip.schoolName}.`
          : `Entregamos a ${name} en casa.`
        : pickup
          ? `No se pudo recoger a ${name} en su parada. Si es un error, comunícate con la empresa.`
          : `No se pudo entregar a ${name} en casa. La empresa se comunicará contigo.`,
    });

    if (!done) {
      await this.adminNotification(trip, {
        type: NotificationType.STUDENT_NOT_PICKED_UP,
        severity: NotificationSeverity.WARNING,
        title: pickup ? 'Recogida no realizada' : 'Entrega no realizada',
        message: `${stop.studentName} — ruta de ${legLabel(trip.leg)} de ${trip.schoolName} (${trip.driverName}).`,
        dedupeKey: `trip:${trip.id}:stop:${stop.id}:not-done`,
      });
    }
  }

  async finished(trip: RouteTrip, stops: TripStop[]): Promise<void> {
    if (trip.leg === TripLeg.PICKUP) {
      await Promise.all(
        stops
          .filter((s) => s.status === TripStopStatus.DONE)
          .map((stop) =>
            this.pushToGuardians(trip, stop, TRIP_PUSH_TYPES.FINISHED, {
              title: 'Llegó al colegio',
              body: `${firstName(stop.studentName)} llegó a ${trip.schoolName}.`,
            }),
          ),
      );
    }

    const count = (status: TripStopStatus): number =>
      stops.filter((s) => s.status === status).length;
    const done = count(TripStopStatus.DONE);
    const notDone = count(TripStopStatus.NOT_DONE);
    const open = stops.length - done - notDone;
    const verb = trip.leg === TripLeg.PICKUP ? 'recogida(s)' : 'entrega(s)';

    await this.adminNotification(trip, {
      type: NotificationType.ROUTE_FINISHED,
      severity:
        notDone + open > 0
          ? NotificationSeverity.WARNING
          : NotificationSeverity.INFO,
      title: 'Ruta finalizada',
      message:
        `${trip.driverName} finalizó la ruta de ${legLabel(trip.leg)} de ${trip.schoolName}: ` +
        `${done} ${verb}, ${notDone} sin ${verb}${open ? `, ${open} sin confirmar` : ''}.`,
      dedupeKey: `trip:${trip.id}:finished`,
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private async pushToGuardians(
    trip: RouteTrip,
    stop: TripStop,
    type: string,
    message: { title: string; body: string },
  ): Promise<void> {
    // PushNotificationsService already swallows its own errors.
    await this.push.notifyGuardiansOfStudent(stop.studentId, {
      ...message,
      data: {
        type,
        tripId: trip.id,
        studentId: stop.studentId,
        tripStopId: stop.id,
      },
    });
  }

  private async adminNotification(
    trip: RouteTrip,
    input: {
      type: NotificationType;
      severity: NotificationSeverity;
      title: string;
      message: string;
      dedupeKey: string;
    },
  ): Promise<void> {
    try {
      await this.notifications.create({
        companyId: trip.companyId,
        sourceType: NotificationSourceType.TRIP,
        sourceId: trip.id,
        ...input,
      });
    } catch (error) {
      this.logger.error(
        `Failed to create admin notification for trip ${trip.id}: ${(error as Error).message}`,
      );
    }
  }
}
