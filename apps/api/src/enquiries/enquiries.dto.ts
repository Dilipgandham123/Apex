import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { EnquiryStatus } from "@hyd/database";

export class CreateEnquiryDto {
  @IsString() @MaxLength(80) schoolSlug!: string;
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsString() @Matches(/^[0-9+() -]{10,18}$/) phone!: string;
  @IsString() @MaxLength(100) course!: string;
  @IsString() @MaxLength(80) preferredSlot!: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @IsOptional() @IsString() @MaxLength(0) website?: string;
}

export class UpdateEnquiryDto {
  @IsEnum(EnquiryStatus) status!: EnquiryStatus;
}
