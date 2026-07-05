import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MinLength } from 'class-validator';

/**
 * Minimum acceptable password length, enforced consistently everywhere a
 * password is accepted (registration, admin-created users, password change).
 */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * Requires at least one lowercase letter, one uppercase letter, and one
 * digit. Deliberately does not also require a symbol — that tends to push
 * users toward predictable substitutions ("Password1!") without a
 * meaningful entropy gain, and would add friction disproportionate to the
 * value for a portfolio-scale app. Length + mixed case + digit is the
 * commonly recommended floor (e.g. OWASP ASVS L1) without going further
 * into policies that are known to backfire on usability.
 */
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

/**
 * Composed class-validator decorator enforcing the app's password policy in
 * one place. Previously `CreateUserDto`/`RegisterDto` only had
 * `@IsString() @IsNotEmpty()` on the password field — the Swagger docs
 * claimed a minimum length, but nothing enforced it server-side, so a
 * 1-character password passed validation. Centralizing here means the rule
 * can't drift between DTOs and only needs to be changed in one place.
 */
export function IsStrongPassword(): PropertyDecorator {
  return applyDecorators(
    IsString(),
    MinLength(PASSWORD_MIN_LENGTH, {
      message: `password must be at least ${PASSWORD_MIN_LENGTH} characters long`,
    }),
    Matches(PASSWORD_COMPLEXITY_REGEX, {
      message: 'password must contain at least one uppercase letter, one lowercase letter, and one number',
    }),
  );
}
