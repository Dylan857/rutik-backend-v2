import { DriverLicenseExpiryScanner } from './driver-license-expiry.scanner';
import { DriverStatus } from '../../drivers/domain/enums/driver-status.enum';
import { NotificationSeverity } from '../domain/enums/notification-severity.enum';
import { NotificationType } from '../domain/enums/notification-type.enum';

const TODAY = new Date('2026-11-23T10:00:00');

function isoInDays(days: number): string {
  const d = new Date(TODAY);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function buildScanner(daysUntilExpiry: number, status = DriverStatus.ACTIVE) {
  const driver = {
    id: 'driver-1',
    companyId: 'company-1',
    userId: 'user-1',
    licenseNumber: 'C-123',
    licenseExpirationDate: isoInDays(daysUntilExpiry),
    status,
  };
  const driverService = { findAll: jest.fn().mockResolvedValue([driver]) };
  const userService = {
    findById: jest
      .fn()
      .mockResolvedValue({ firstName: 'Carlos', lastName: 'Ruiz' }),
  };
  const notificationsService = {
    create: jest.fn().mockResolvedValue({ id: 'n-1' }),
  };
  const mailer = { notifyCompanyAdmins: jest.fn().mockResolvedValue(undefined) };

  const scanner = new DriverLicenseExpiryScanner(
    driverService as never,
    userService as never,
    notificationsService as never,
    mailer as never,
  );
  return { scanner, notificationsService, mailer };
}

describe('DriverLicenseExpiryScanner', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(TODAY);
  });
  afterAll(() => jest.useRealTimers());

  it.each([30, 20, 15])('alerts on the %i-day milestone', async (days) => {
    const { scanner, notificationsService, mailer } = buildScanner(days);
    await scanner.scan();

    expect(notificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.DRIVER_LICENSE_EXPIRING,
        severity: NotificationSeverity.WARNING,
        dedupeKey: expect.stringContaining(`:M${days}`),
      }),
    );
    expect(mailer.notifyCompanyAdmins).toHaveBeenCalledTimes(1);
  });

  it.each([29, 21, 19, 16, 11])('stays quiet %i days out', async (days) => {
    const { scanner, notificationsService, mailer } = buildScanner(days);
    await scanner.scan();

    expect(notificationsService.create).not.toHaveBeenCalled();
    expect(mailer.notifyCompanyAdmins).not.toHaveBeenCalled();
  });

  it.each([10, 7, 1, 0])('reminds daily %i days out', async (days) => {
    const { scanner, notificationsService } = buildScanner(days);
    await scanner.scan();

    expect(notificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        dedupeKey: expect.stringContaining(':DAILY:'),
      }),
    );
  });

  it('keeps reminding daily, as critical, once expired', async () => {
    const { scanner, notificationsService, mailer } = buildScanner(-3);
    await scanner.scan();

    expect(notificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: NotificationSeverity.CRITICAL,
        title: 'Licencia de conducción vencida',
        dedupeKey: expect.stringContaining(':DAILY:'),
      }),
    );
    expect(mailer.notifyCompanyAdmins).toHaveBeenCalledWith(
      'company-1',
      'Licencia de conducción vencida',
      expect.stringContaining('venció hace 3 día(s)'),
      true,
    );
  });

  it('does not email when the notification was deduped', async () => {
    const { scanner, notificationsService, mailer } = buildScanner(5);
    notificationsService.create.mockResolvedValue(null);
    await scanner.scan();

    expect(mailer.notifyCompanyAdmins).not.toHaveBeenCalled();
  });

  it('skips inactive drivers', async () => {
    const { scanner, notificationsService } = buildScanner(
      5,
      DriverStatus.INACTIVE,
    );
    await scanner.scan();

    expect(notificationsService.create).not.toHaveBeenCalled();
  });
});
