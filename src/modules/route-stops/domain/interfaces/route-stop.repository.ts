import { RouteStop } from '../route-stop.entity';

export interface RouteStopFilters {
  schoolRouteId?: string;
  studentId?: string;
}

export interface IRouteStopRepository {
  create(data: Partial<RouteStop>): Promise<RouteStop>;
  findAll(filters: RouteStopFilters): Promise<RouteStop[]>;
  findById(id: string): Promise<RouteStop | null>;
  findByStudentId(studentId: string): Promise<RouteStop | null>;
  findByRouteAndStudent(
    routeId: string,
    studentId: string,
  ): Promise<RouteStop | null>;
  // Updates only the stop_order field — avoids overwriting the coordinate snapshot
  updateOrder(id: string, stopOrder: number): Promise<void>;
  delete(id: string): Promise<void>;
}

export const ROUTE_STOP_REPOSITORY = Symbol('ROUTE_STOP_REPOSITORY');
