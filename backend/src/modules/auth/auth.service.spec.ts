import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { User, UserRole, UserStatus } from '../../entities/user.entity';

// bcryptjs's CJS export doesn't support jest.spyOn() reassignment of its
// named exports in this environment ("Cannot redefine property"), so the
// whole module is mocked instead — the standard, reliable way to stub a
// CJS dependency's functions independently per test.
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));
import * as bcrypt from 'bcryptjs';

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let jwtService: jest.Mocked<JwtService>;

  const buildUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 'user-1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'hashed-password',
      role: UserRole.HEALTHCARE_STAFF,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('signed.jwt.token'),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    // clearAllMocks (not restoreAllMocks): the bcrypt functions are plain
    // jest.fn()s from the module factory above, not spies on the real
    // implementation, so there is nothing to "restore" — only call history
    // and configured return values need resetting between tests.
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('returns the user without the password field on valid credentials', async () => {
      const user = buildUser();
      userRepository.findOne.mockResolvedValue(user);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.validateUser('jane@example.com', 'correct-password');

      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('jane@example.com');
    });

    it('throws UnauthorizedException when no user exists for the email', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.validateUser('missing@example.com', 'anything')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the password does not match the stored hash', async () => {
      userRepository.findOne.mockResolvedValue(buildUser());
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.validateUser('jane@example.com', 'wrong-password')).rejects.toThrow(UnauthorizedException);
    });

    it('never calls bcrypt.compare when the user does not exist (no timing oracle via short-circuit)', async () => {
      userRepository.findOne.mockResolvedValue(null);
      const compareSpy = mockedBcrypt.compare;

      await expect(service.validateUser('missing@example.com', 'anything')).rejects.toThrow(UnauthorizedException);
      expect(compareSpy).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException for a correct password on an inactive account', async () => {
      userRepository.findOne.mockResolvedValue(buildUser({ status: UserStatus.INACTIVE }));
      mockedBcrypt.compare.mockResolvedValue(true as never);

      await expect(service.validateUser('jane@example.com', 'correct-password')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('returns a signed access token and public user fields on success', async () => {
      const user = buildUser();
      userRepository.findOne.mockResolvedValue(user);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.login({ email: user.email, password: 'correct-password' });

      expect(result.access_token).toBe('signed.jwt.token');
      expect(result.user).toEqual({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: user.id, email: user.email, role: user.role }),
      );
    });

    it('rejects when the supplied role does not match the account role', async () => {
      const user = buildUser({ role: UserRole.HEALTHCARE_STAFF });
      userRepository.findOne.mockResolvedValue(user);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      await expect(
        service.login({ email: user.email, password: 'correct-password', role: UserRole.ADMIN }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('propagates invalid-credentials failure from validateUser', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.login({ email: 'missing@example.com', password: 'x' })).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('hashes the password before persisting the new user', async () => {
      userRepository.findOne.mockResolvedValue(null);
      const hashSpy = mockedBcrypt.hash.mockResolvedValue('hashed-value' as never);
      userRepository.create.mockImplementation((data) => data as User);
      userRepository.save.mockImplementation(async (data) => ({ ...data, id: 'new-id' }) as User);

      const result = await service.register({
        name: 'New User',
        email: 'new@example.com',
        password: 'PlainText123',
        role: UserRole.HEALTHCARE_STAFF,
      });

      expect(hashSpy).toHaveBeenCalledWith('PlainText123', 10);
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'hashed-value' }),
      );
      expect(result).not.toHaveProperty('password');
    });

    it('throws when the email is already registered', async () => {
      userRepository.findOne.mockResolvedValue(buildUser());

      await expect(
        service.register({ name: 'Dup', email: 'jane@example.com', password: 'PlainText123' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('rejects an attempt to self-register as Admin', async () => {
      userRepository.findOne.mockResolvedValue(null);

      // Cast is deliberate: RegisterDto's type only allows Healthcare Staff
      // or Guest, but the service must still defend at runtime against a
      // client bypassing the compile-time type (e.g. a raw HTTP request
      // with role: "Admin" in the JSON body).
      await expect(
        service.register({
          name: 'Sneaky',
          email: 'sneaky@example.com',
          password: 'PlainText123',
          role: UserRole.ADMIN as unknown as UserRole.HEALTHCARE_STAFF,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('defaults to Healthcare Staff when no role is supplied', async () => {
      userRepository.findOne.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashed-value' as never);
      userRepository.create.mockImplementation((data) => data as User);
      userRepository.save.mockImplementation(async (data) => data as User);

      await service.register({ name: 'No Role', email: 'norole@example.com', password: 'PlainText123' });

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.HEALTHCARE_STAFF }),
      );
    });
  });

  describe('updateProfile', () => {
    it('requires currentPassword when a new password is provided', async () => {
      userRepository.findOne.mockResolvedValue(buildUser());

      await expect(
        service.updateProfile('user-1', { password: 'NewPassword123' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects the password change when currentPassword is incorrect', async () => {
      userRepository.findOne.mockResolvedValue(buildUser());
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(
        service.updateProfile('user-1', {
          password: 'NewPassword123',
          currentPassword: 'wrong-current',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('hashes and persists the new password when currentPassword is verified', async () => {
      const user = buildUser();
      userRepository.findOne.mockResolvedValue(user);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockedBcrypt.hash.mockResolvedValue('new-hashed-password' as never);
      userRepository.save.mockImplementation(async (data) => data as User);

      await service.updateProfile('user-1', {
        password: 'NewPassword123',
        currentPassword: 'correct-current',
      });

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'new-hashed-password' }),
      );
    });

    it('throws UnauthorizedException when the target user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.updateProfile('missing-user', { name: 'X' } as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
