import { IsDateString, IsNumber, IsString, Max, MaxLength, MinLength, NotEquals } from "class-validator";

export class ExtendDeadlineDto {
  @IsDateString() newDeadline!: string;
  @IsString() @MinLength(5) @MaxLength(500) reason!: string;
}

export class AdjustKilometresDto {
  @IsNumber({ maxDecimalPlaces: 2 }) @NotEquals(0) @Max(999) adjustmentKm!: number;
  @IsString() @MinLength(5) @MaxLength(500) reason!: string;
}
