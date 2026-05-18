export class RegisterDto {
  email: string;
  name?: string;
  password?: string;
}

export class VerifyOtpDto {
  email: string;
  code: string;
}

export class LoginDto {
  email: string;
  password?: string;
}

export class ForgotPasswordDto {
  email: string;
}

export class ResetPasswordDto {
  email: string;
  code: string;
  password?: string;
}
