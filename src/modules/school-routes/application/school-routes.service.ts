import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SchoolAssignment } from '../../school-assignments/domain/school-assignment.entity';
import { SchoolRoute } from '../domain/school-route.entity';
import { RouteStatus } from '../domain/enums/route-status.enum';
import {
  ISchoolRouteRepository,
  RouteFilters,
  SCHOOL_ROUTE_REPOSITORY,
} from '../domain/interfaces/school-route.repository';
import { UpdateSchoolRouteDto } from '../infrastructure/api/dto/update-school-route.dto';

@Injectable()
export class SchoolRoutesService {
  private readonly logger = new Logger(SchoolRoutesService.name);

  constructor(
    @Inject(SCHOOL_ROUTE_REPOSITORY)
    private readonly routeRepository: ISchoolRouteRepository,
  ) {}

  async findAll(filters: RouteFilters): Promise<SchoolRoute[]> {
    return this.routeRepository.findAll(filters);
  }

  async findById(id: string): Promise<SchoolRoute> {
    const route = await this.routeRepository.findById(id);

    if (!route) {
      throw new NotFoundException(`School route with ID "${id}" not found`);
    }

    return route;
  }

  async update(id: string, dto: UpdateSchoolRouteDto): Promise<SchoolRoute> {
    await this.findById(id);
    return this.routeRepository.update(id, dto);
  }

  async softDelete(id: string): Promise<void> {
    await this.findById(id);
    await this.routeRepository.softDelete(id);
  }

  // Called by RouteStopsService after a successful Google Directions call —
  // persists the cached polyline/distance/duration so it isn't refetched on
  // every route read, only when the stop set actually changes.
  async updateDirectionsCache(
    id: string,
    data: {
      polyline: string;
      distanceMeters: number;
      durationSeconds: number;
      directionsUpdatedAt: Date;
      polylineReturn?: string;
      distanceMetersReturn?: number;
      durationSecondsReturn?: number;
    },
  ): Promise<void> {
    await this.routeRepository.update(id, data);
  }

  // ── syncRoute ──────────────────────────────────────────────────────────────────
  //
  // Called exclusively by SchoolAssignmentsService — never exposed via REST.
  //
  // 'create'     → Ensures an ACTIVE route exists for the assignment. If a
  //                soft-deleted route exists (e.g. from a previous cycle), it is
  //                restored; otherwise a new one is created.
  // 'update'     → The assignment's driver or vehicle changed. The route owns no
  //                duplicated data so no route fields need updating; we only
  //                guarantee the route remains ACTIVE.
  // 'deactivate' → Sets the route status to INACTIVE without hard-deleting it,
  //                preserving the record for audit and future reactivation.
  //
  async syncRoute(
    action: 'create' | 'update' | 'deactivate',
    assignment: SchoolAssignment,
  ): Promise<void> {
    this.logger.log(`syncRoute [${action}] — assignmentId: ${assignment.id}`);

    // withDeleted:true so we can locate and restore previously soft-deleted routes
    const existing = await this.routeRepository.findByAssignmentId(
      assignment.id,
      true,
    );

    switch (action) {
      case 'create': {
        if (!existing) {
          await this.routeRepository.create({
            companyId: assignment.companyId,
            schoolAssignmentId: assignment.id,
            status: RouteStatus.ACTIVE,
          });
          this.logger.log(`Route created for assignment ${assignment.id}`);
        } else if (existing.deletedAt !== null) {
          // Restore a previously soft-deleted route and re-activate it
          await this.routeRepository.restore(existing.id);
          await this.routeRepository.update(existing.id, {
            status: RouteStatus.ACTIVE,
          });
          this.logger.log(
            `Route ${existing.id} restored for assignment ${assignment.id}`,
          );
        } else if (existing.status !== RouteStatus.ACTIVE) {
          await this.routeRepository.update(existing.id, {
            status: RouteStatus.ACTIVE,
          });
          this.logger.log(
            `Route ${existing.id} re-activated for assignment ${assignment.id}`,
          );
        }
        break;
      }

      case 'update': {
        // Driver or vehicle changed on the assignment. Route data is not duplicated
        // so nothing to update on the route record itself — only ensure it stays ACTIVE.
        if (
          existing &&
          !existing.deletedAt &&
          existing.status !== RouteStatus.ACTIVE
        ) {
          await this.routeRepository.update(existing.id, {
            status: RouteStatus.ACTIVE,
          });
          this.logger.log(
            `Route ${existing.id} kept ACTIVE after assignment update`,
          );
        }
        break;
      }

      case 'deactivate': {
        if (
          existing &&
          !existing.deletedAt &&
          existing.status === RouteStatus.ACTIVE
        ) {
          await this.routeRepository.update(existing.id, {
            status: RouteStatus.INACTIVE,
          });
          this.logger.log(
            `Route ${existing.id} deactivated for assignment ${assignment.id}`,
          );
        }
        break;
      }
    }
  }
}
