import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Otp } from '../entities/otp.entity';

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(Otp)
    private otpRepository: Repository<Otp>,
  ) {}

  async generateOtp(email: string, purpose: string): Promise<string> {
    // 1. Generate 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Set expiration date (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // 3. Delete previous OTPs of the same email and purpose
    await this.otpRepository.delete({ email, purpose });

    // 4. Save new OTP
    const otp = this.otpRepository.create({
      email,
      code,
      purpose,
      expiresAt,
    });
    await this.otpRepository.save(otp);

    return code;
  }

  async verifyOtp(email: string, code: string, purpose: string): Promise<boolean> {
    const otp = await this.otpRepository.findOne({
      where: {
        email,
        code,
        purpose,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!otp) {
      return false;
    }

    // OTP is valid! Delete it so it can't be reused
    await this.otpRepository.delete({ email, purpose });
    return true;
  }
}
