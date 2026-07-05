import { IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsStrongPassword, PASSWORD_MIN_LENGTH } from '../../../common/validators/is-strong-password.decorator';

/**
 * Previously `AuthController.updateProfile` accepted a bare inline object
 * type (`{ name?, password?, currentPassword? }`) rather than a class DTO.
 * Because NestJS's global `ValidationPipe` only validates `class-validator`
 * decorators on actual classes, that inline type silently bypassed the
 * password strength policy entirely — a user could set their password to a
 * single character through the "change password" flow even after
 * `CreateUserDto`/`RegisterDto` were locked down. Promoting it to a real
 * DTO closes that gap and keeps the same policy enforced everywhere a
 * password is set.
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Jane Doe', description: 'New display name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({
    example: 'NewSecurePass123',
    description: `New password (minimum ${PASSWORD_MIN_LENGTH} characters; must include uppercase, lowercase, and a number). Requires currentPassword to also be provided.`,
    minLength: PASSWORD_MIN_LENGTH,
  })
  @IsOptional()
  @IsStrongPassword()
  password?: string;

  @ApiPropertyOptional({
    example: 'OldPassword123',
    description: 'Current password — required when changing the password',
  })
  @ValidateIf((dto: UpdateProfileDto) => !!dto.password)
  @IsString()
  @IsNotEmpty({ message: 'currentPassword is required to change password' })
  currentPassword?: string;
}
