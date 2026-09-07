import { IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class ManualPaymentDto {
  @IsString() enrollmentId!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(1000000) amount!: number;
  @IsIn(["CASH", "UPI"]) method!: "CASH" | "UPI";
  @IsOptional() @IsString() @MaxLength(100) reference?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
export class CreateOrderDto { @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(1000000) amount!: number; }
export class VerifyPaymentDto {
  @IsString() razorpayOrderId!: string;
  @IsString() razorpayPaymentId!: string;
  @IsString() @MinLength(64) @MaxLength(64) razorpaySignature!: string;
}
export class RefundPaymentDto {
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(1000000) amount!: number;
  @IsString() @MinLength(5) @MaxLength(500) reason!: string;
}
