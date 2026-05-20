import { Injectable, ConflictException, BadRequestException, UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { OtpService } from '../otp/otp.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto, VerifyOtpDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private otpService: OtpService,
    private mailService: MailService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const { email, name, password } = dto;

    // Check if user already exists
    let user = await this.userRepository.findOne({ where: { email } });
    if (user) {
      if (user.isVerified) {
        throw new ConflictException('Un utilisateur avec cet email existe déjà.');
      }
      // User exists but was not verified yet. We will update the info and send a new OTP.
      if (password) {
        user.password = await bcrypt.hash(password, 10);
      }
      user.name = name || user.name;
      await this.userRepository.save(user);
    } else {
      // Create new unverified user
      const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;
      user = this.userRepository.create({
        email,
        name,
        password: hashedPassword,
        isVerified: false,
      });
      await this.userRepository.save(user);
    }

    // Generate and send OTP for email verification
    const code = await this.otpService.generateOtp(email, 'EMAIL_VERIFICATION');
    await this.mailService.sendOtpEmail(email, code, 'EMAIL_VERIFICATION');

    return {
      message: "Inscription réussie. Un code OTP a été envoyé à votre adresse email pour validation.",
      email,
    };
  }

  async verifyEmail(dto: VerifyOtpDto) {
    const { email, code } = dto;

    // Verify OTP
    const isValid = await this.otpService.verifyOtp(email, code, 'EMAIL_VERIFICATION');
    if (!isValid) {
      throw new BadRequestException('Code OTP invalide ou expiré.');
    }

    // Update user status
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    user.isVerified = true;
    await this.userRepository.save(user);

    return {
      message: 'Votre adresse email a été validée avec succès. Vous pouvez maintenant vous connecter.',
    };
  }

  async login(dto: LoginDto) {
    const { email, password } = dto;

    // Find user
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Identifiants de connexion invalides.');
    }

    // Check if verified
    if (!user.isVerified) {
      throw new ForbiddenException("Veuillez valider votre adresse email avant de vous connecter.");
    }

    // Check password
    if (user.password && password) {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Identifiants de connexion invalides.');
      }
    } else if (user.password || password) {
      throw new UnauthorizedException('Identifiants de connexion invalides.');
    }

    // Generate JWT
    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    return {
      message: 'Connexion réussie.',
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const { email } = dto;

    // Check if user exists
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException("Aucun compte n'est associé à cette adresse email.");
    }

    // Generate and send OTP for password reset
    const code = await this.otpService.generateOtp(email, 'PASSWORD_RESET');
    await this.mailService.sendOtpEmail(email, code, 'PASSWORD_RESET');

    return {
      message: "Un code de réinitialisation de mot de passe a été envoyé par email.",
      email,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { email, code, password } = dto;

    if (!password) {
      throw new BadRequestException('Le nouveau mot de passe est obligatoire.');
    }

    // Verify OTP
    const isValid = await this.otpService.verifyOtp(email, code, 'PASSWORD_RESET');
    if (!isValid) {
      throw new BadRequestException('Code OTP invalide ou expiré.');
    }

    // Update user password
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    user.password = await bcrypt.hash(password, 10);
    await this.userRepository.save(user);

    return {
      message: 'Votre mot de passe a été réinitialisé avec succès.',
    };
  }

  async updateProfile(userId: number, dto: { name?: string; password?: string }) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("Utilisateur introuvable.");
    }
    if (dto.name) {
      user.name = dto.name;
    }
    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, 10);
    }
    const savedUser = await this.userRepository.save(user);
    return {
      id: savedUser.id,
      name: savedUser.name,
      email: savedUser.email,
      isVerified: savedUser.isVerified,
    };
  }
}
