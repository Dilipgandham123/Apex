import { ArrayMaxSize, IsArray, IsNumber, IsOptional, IsString, IsUrl, Max, MaxLength, Min, MinLength } from "class-validator";

export class StartLessonDto {
  @IsString() enrollmentId!: string;
  @IsNumber({ maxDecimalPlaces: 1 }) @Min(0) @Max(9999999) startOdometerKm!: number;
  @IsOptional() @IsUrl({ require_protocol: true }) startEvidenceUrl?: string;
}

export class EndLessonDto {
  @IsNumber({ maxDecimalPlaces: 1 }) @Min(0) @Max(9999999) endOdometerKm!: number;
  @IsOptional() @IsUrl({ require_protocol: true }) endEvidenceUrl?: string;
  @IsOptional() @IsString() @MaxLength(500) customerSummary?: string;
  @IsOptional() @IsString() @MaxLength(1000) privateNote?: string;
  @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) skills!: string[];
}

export class SearchCustomersDto {
  @IsString() @MinLength(2) @MaxLength(80) query!: string;
}
