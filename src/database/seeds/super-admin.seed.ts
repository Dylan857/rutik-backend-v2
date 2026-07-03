import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../../shared/database/data-source';
import { User } from '../../modules/user/domain/user.entity';
import { UserRole } from '../../modules/user/domain/enums/user-role.enum';
import { UserStatus } from '../../modules/user/domain/enums/user-status.enum';

const BCRYPT_ROUNDS = 10;

const REQUIRED_ENV_VARS = [
  'SUPER_ADMIN_EMAIL',
  'SUPER_ADMIN_PASSWORD',
  'SUPER_ADMIN_DOCUMENT',
  'SUPER_ADMIN_FIRST_NAME',
  'SUPER_ADMIN_LAST_NAME',
] as const;

interface SuperAdminConfig {
  email: string;
  password: string;
  document: string;
  firstName: string;
  lastName: string;
}

function readConfig(): SuperAdminConfig {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  const password = process.env.SUPER_ADMIN_PASSWORD!;
  if (password.length < 8) {
    throw new Error('SUPER_ADMIN_PASSWORD must be at least 8 characters');
  }

  return {
    email: process.env.SUPER_ADMIN_EMAIL!.trim().toLowerCase(),
    password,
    document: process.env.SUPER_ADMIN_DOCUMENT!.trim(),
    firstName: process.env.SUPER_ADMIN_FIRST_NAME!.trim(),
    lastName: process.env.SUPER_ADMIN_LAST_NAME!.trim(),
  };
}

async function run(): Promise<void> {
  const config = readConfig();

  await AppDataSource.initialize();
  const userRepository = AppDataSource.getRepository(User);

  const existing = await userRepository.findOne({
    where: [{ email: config.email }, { document: config.document }],
  });

  if (existing) {
    console.log(
      `A user with email "${existing.email}" or document "${existing.document}" already exists. Skipping.`,
    );
    return;
  }

  const hashedPassword = await bcrypt.hash(config.password, BCRYPT_ROUNDS);

  const superAdmin = userRepository.create({
    companyId: null,
    role: UserRole.SUPER_ADMIN,
    firstName: config.firstName,
    lastName: config.lastName,
    document: config.document,
    email: config.email,
    password: hashedPassword,
    status: UserStatus.ACTIVE,
  });

  await userRepository.save(superAdmin);
  console.log(`Super admin created: ${config.email}`);
}

run()
  .catch((error: unknown) => {
    console.error('Failed to seed super admin:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });
