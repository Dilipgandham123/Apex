import { IsOptional, IsString, Matches, MinLength } from "class-validator";

export class PasswordLoginDto {
  @IsString()
  identifier!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  schoolId?: string;
}

export class RequestOtpDto {
  @Matches(/^[6-9]\d{9}$/)
  phone!: string;
}

export class VerifyOtpDto {
  @IsString()
  challengeId!: string;

  @Matches(/^\d{6}$/)
  code!: string;
}
