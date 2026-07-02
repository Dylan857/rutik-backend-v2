import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../domain/interfaces/user.repository';
import { User } from '../domain/user.entity';
import { CreateUserDto } from '../infrastructure/api/dto/create-user.dto';
import { UpdateUserDto } from '../infrastructure/api/dto/update-user.dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const [byEmail, byDocument] = await Promise.all([
      this.userRepository.findByEmail(dto.email),
      this.userRepository.findByDocument(dto.document),
    ]);

    if (byEmail) {
      throw new ConflictException(
        `A user with email "${dto.email}" already exists`,
      );
    }
    if (byDocument) {
      throw new ConflictException(
        `A user with document "${dto.document}" already exists`,
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    return this.userRepository.create({ ...dto, password: hashedPassword });
  }

  async findAll(companyId?: string): Promise<User[]> {
    return this.userRepository.findAll(companyId);
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async findByDocument(document: string): Promise<User | null> {
    return this.userRepository.findByDocument(document);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const current = await this.findById(id);

    if (dto.email && dto.email !== current.email) {
      const existing = await this.userRepository.findByEmail(dto.email);
      if (existing) {
        throw new ConflictException(
          `A user with email "${dto.email}" already exists`,
        );
      }
    }

    if (dto.document && dto.document !== current.document) {
      const existing = await this.userRepository.findByDocument(dto.document);
      if (existing) {
        throw new ConflictException(
          `A user with document "${dto.document}" already exists`,
        );
      }
    }

    return this.userRepository.update(id, dto);
  }

  async softDelete(id: string): Promise<void> {
    await this.findById(id);
    await this.userRepository.softDelete(id);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.updateLastLogin(id);
  }
}
