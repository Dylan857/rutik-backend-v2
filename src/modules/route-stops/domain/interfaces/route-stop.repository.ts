import { RouteStop } from '../route-stop.entity';

export interface RouteStopFilters {
  schoolRouteId?: string;
  studentId?: string;
}

export interface RouteStopOrderUpdate {
  stopOrder: number | null;
  stopOrderReturn: number | null;
}

export interface IRouteStopRepository {
  create(data: Partial<RouteStop>): Promise<RouteStop>;
  // Eager-loads the `student` relation — callers need `student.tripType` to
  // split stops into pickup/dropoff legs.
  findAll(filters: RouteStopFilters): Promise<RouteStop[]>;
  findById(id: string): Promise<RouteStop | null>;
  findByStudentId(studentId: string): Promise<RouteStop | null>;
  findByRouteAndStudent(
    routeId: string,
    studentId: string,
  ): Promise<RouteStop | null>;
  // Updates only the two order fields — avoids overwriting the coordinate snapshot
  updateOrder(id: string, order: RouteStopOrderUpdate): Promise<void>;
  delete(id: string): Promise<void>;
}

export const ROUTE_STOP_REPOSITORY = Symbol('ROUTE_STOP_REPOSITORY');
