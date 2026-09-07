import { IsDateString, IsEmail, IsEnum, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from "class-validator";

export enum TransmissionDto {
  MANUAL = "MANUAL",
  AUTOMATIC = "AUTOMATIC",
}

export class CreateCourseDto {
  @Matches(/^[A-Za-z0-9-]{2,20}$/)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsEnum(TransmissionDto)
  transmission!: TransmissionDto;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @IsInt()
  @Min(1)
  @Max(200)
  classCount!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.1)
  @Max(100)
  targetKmPerClass!: number;

  @IsInt()
  @Min(1)
  @Max(365)
  durationDays!: number;
}

export class CreateCustomerEnrollmentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName!: string;

  @Matches(/^[6-9]\d{9}$/)
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsString()
  courseId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  initialPaid!: number;
}
