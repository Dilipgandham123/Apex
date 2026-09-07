import { IsBoolean, IsDateString, IsEmail, IsEnum, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from "class-validator";

export enum TransmissionDto { MANUAL = "MANUAL", AUTOMATIC = "AUTOMATIC" }
export enum StaffStatusDto { ACTIVE = "ACTIVE", INACTIVE = "INACTIVE" }
export enum VehicleStatusDto { AVAILABLE = "AVAILABLE", MAINTENANCE = "MAINTENANCE", INACTIVE = "INACTIVE" }
export enum IssueSeverityDto { LOW = "LOW", MEDIUM = "MEDIUM", HIGH = "HIGH" }

export class CreateStaffDto {
  @IsString() @MinLength(2) @MaxLength(100) displayName!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(12) password!: string;
  @IsString() @MinLength(3) @MaxLength(40) licenceNumber!: string;
  @IsDateString() licenceExpiresAt!: string;
  @IsBoolean() canDriveManual!: boolean;
  @IsBoolean() canDriveAutomatic!: boolean;
}

export class UpdateStaffStatusDto {
  @IsEnum(StaffStatusDto) status!: StaffStatusDto;
}

export class CreateVehicleDto {
  @Matches(/^[A-Za-z0-9 -]{5,20}$/) registrationNumber!: string;
  @IsString() @MinLength(2) @MaxLength(50) make!: string;
  @IsString() @MinLength(1) @MaxLength(50) model!: string;
  @IsEnum(TransmissionDto) transmission!: TransmissionDto;
  @IsNumber({ maxDecimalPlaces: 1 }) @Min(0) @Max(9999999) odometerKm!: number;
  @IsOptional() @IsDateString() insuranceExpiresAt?: string;
  @IsOptional() @IsDateString() pucExpiresAt?: string;
}

export class AssignVehicleDto {
  @IsString() vehicleId!: string;
}

export class UpdateVehicleStatusDto {
  @IsEnum(VehicleStatusDto) status!: VehicleStatusDto;
}

export class ReportVehicleIssueDto {
  @IsEnum(IssueSeverityDto) severity!: IssueSeverityDto;
  @IsString() @MinLength(5) @MaxLength(500) description!: string;
}
