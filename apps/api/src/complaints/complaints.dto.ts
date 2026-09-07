import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min, MinLength, ValidateNested } from "class-validator";

export class ComplaintAttachmentDto {
  @IsUrl({ protocols: ["https"], require_protocol: true }) url!: string;
  @IsString() @MinLength(1) @MaxLength(200) publicId!: string;
  @IsString() @MinLength(1) @MaxLength(160) fileName!: string;
  @IsString() @MinLength(1) @MaxLength(100) mimeType!: string;
  @IsInt() @Min(1) @Max(5_242_880) sizeBytes!: number;
}

export class CreateComplaintDto {
  @IsString() @MinLength(4) @MaxLength(120) subject!: string;
  @IsString() @MinLength(10) @MaxLength(3000) description!: string;
  @IsOptional() @IsString() lessonId?: string;
  @IsOptional() @IsString() staffId?: string;
  @IsOptional() @IsString() vehicleId?: string;
  @IsOptional() @IsString() paymentId?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(3) @ValidateNested({ each: true }) @Type(() => ComplaintAttachmentDto) attachments?: ComplaintAttachmentDto[];
}

export class ComplaintReplyDto {
  @IsString() @MinLength(2) @MaxLength(3000) body!: string;
  @IsOptional() @IsBoolean() private?: boolean;
}

export class UpdateComplaintDto {
  @IsOptional() @IsEnum(["SUBMITTED", "IN_REVIEW", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"]) status?: "SUBMITTED" | "IN_REVIEW" | "WAITING_CUSTOMER" | "RESOLVED" | "CLOSED";
  @IsOptional() @IsEnum(["LOW", "NORMAL", "HIGH", "URGENT"]) priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  @IsOptional() @IsString() @MinLength(4) @MaxLength(2000) resolutionOutcome?: string;
}
