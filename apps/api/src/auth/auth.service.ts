import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role } from '../common/enums/role.enum';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { Clinic, ClinicDocument } from '../clinics/schemas/clinic.schema';
import { Professional, ProfessionalDocument } from '../professionals/schemas/professional.schema';
import { RedisService } from '../redis/redis.service';
import { UsersService } from '../users/users.service';
import { UserDocument } from './schemas/user.schema';
import { LoginAttendantDto } from './dto/login-attendant.dto';
import { LoginStandardDto } from './dto/login-standard.dto';
import { SignupDto } from './dto/signup.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SubscriptionPlan } from '../subscriptions/constants/subscription.constants';
import { GeocodingService } from '../common/geocoding/geocoding.service';
import { composeAddressText } from '../common/utils/address-form.util';

const TOKEN_TTL = 7 * 24 * 3600;
const STANDARD_ROLES = [Role.PATIENT, Role.CLINIC, Role.PROFESSIONAL];
const MAX_AGE_YEARS = 120;

export interface AuthUser {
  id: string;
  role: string;
  email?: string;
  username?: string;
  clinicId?: string;
  professionalId?: string;
  name?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly subscriptionsService: SubscriptionsService,
    @InjectModel(Patient.name) private readonly patientModel: Model<PatientDocument>,
    @InjectModel(Clinic.name) private readonly clinicModel: Model<ClinicDocument>,
    @InjectModel(Professional.name) private readonly professionalModel: Model<ProfessionalDocument>,
    private readonly geocodingService: GeocodingService,
  ) {}

  async signup(dto: SignupDto): Promise<AuthResponse> {
    const user = await this.usersService.createUser(dto);
    const userId = user._id.toString();

    // No native transaction (MongoDB requires a replica set): if any role
    // document fails to create, compensate by removing what was created so we
    // never leave an orphaned user that can log in but has no profile.
    // (Mongoose casts the userId string to ObjectId per the schema.)
    let createdClinicId: Types.ObjectId | null = null;
    try {
      if (dto.role === Role.PATIENT) {
        await this.createPatientDocument(userId, dto);
      } else if (dto.role === Role.CLINIC) {
        // Endereço estruturado (addressForm) é a fonte; deriva o texto p/ exibição.
        const addressText = dto.addressForm ? composeAddressText(dto.addressForm) : dto.addressText;
        const city = dto.addressForm?.city ?? dto.city;
        const addressReference = dto.addressForm?.reference ?? dto.addressReference;

        // Geocodifica o endereço no cadastro para que a clínica já apareça nas
        // buscas por proximidade. Se o Nominatim falhar, salva o endereço sem
        // coordenadas; a clínica pode reabastecê-las salvando em "Dados da clínica".
        const coords = dto.addressForm
          ? await this.geocodingService.geocodeAddressForm(dto.addressForm)
          : addressText
            ? await this.geocodingService.geocodeAddress(addressText)
            : null;

        const clinic = await this.clinicModel.create({
          // Store as ObjectId so profile lookups by userId match (the @Prop
          // ObjectId type does not cast a raw string here).
          userId: new Types.ObjectId(userId),
          name: dto.name,
          cnpj: dto.cnpj?.replace(/\D/g, ''),
          // Seed the contact email with the signup email; editable later.
          email: dto.email,
          addressText,
          addressReference,
          addressForm: dto.addressForm,
          city,
          ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
        });
        createdClinicId = clinic._id;
        await this.subscriptionsService.create({ clinicId: clinic._id.toString(), plan: SubscriptionPlan.FREE });
      } else if (dto.role === Role.PROFESSIONAL) {
        // Geocodifica para que o profissional autônomo apareça nas buscas por
        // proximidade. Falha do Nominatim não bloqueia o cadastro.
        const proCoords = dto.addressForm
          ? await this.geocodingService.geocodeAddressForm(dto.addressForm)
          : null;

        await this.professionalModel.create({
          userId: new Types.ObjectId(userId),
          name: dto.name,
          specialty: dto.specialty,
          registration: dto.regNum,
          cpf: dto.cpf,
          // Seed the contact email with the signup email; editable later.
          email: dto.email,
          addressForm: dto.addressForm,
          ...(proCoords ? { lat: proCoords.lat, lng: proCoords.lng } : {}),
          ...(dto.plan ? { plan: dto.plan } : {}),
        });
      }
    } catch (error) {
      if (createdClinicId) {
        await this.clinicModel.deleteOne({ _id: createdClinicId }).exec().catch(() => undefined);
      }
      await this.usersService.deleteById(userId).catch(() => undefined);

      // A unique-index collision (e.g. CNPJ já cadastrado) chega aqui como um
      // MongoServerError cru; sem tradução vira 500. Devolve um 409 com mensagem
      // que o frontend consegue mapear ao campo correto.
      if ((error as { code?: number }).code === 11000) {
        const duplicatedKey = Object.keys(
          (error as { keyPattern?: Record<string, unknown> }).keyPattern ?? {},
        )[0];
        if (duplicatedKey === 'cnpj') {
          throw new ConflictException('CNPJ já cadastrado');
        }
        throw new ConflictException('Estabelecimento já cadastrado');
      }
      throw error;
    }

    const token = this.signToken(userId, user.role as Role);
    await this.redisService.saveToken(userId, token, TOKEN_TTL);

    return { accessToken: token, user: this.toAuthUser(user) };
  }

  async loginStandard(dto: LoginStandardDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || !STANDARD_ROLES.includes(user.role as Role)) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await user.comparePassword(dto.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const userId = user._id.toString();
    const token = this.signToken(userId, user.role as Role);

    await this.redisService.saveToken(userId, token, TOKEN_TTL);

    return { accessToken: token, user: this.toAuthUser(user) };
  }

  async loginAttendant(dto: LoginAttendantDto): Promise<AuthResponse> {
    // O identificador pode apontar para uma clínica (id ou customCode) ou para um
    // profissional autônomo (id). Procura o atendente em ambos os donos.
    const user = await this.resolveAttendant(dto.clinicId, dto.username);

    if (!user || user.role !== Role.ATTENDANT) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await user.comparePassword(dto.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const userId = user._id.toString();
    const token = this.signToken(userId, user.role as Role);

    await this.redisService.saveToken(userId, token, TOKEN_TTL);

    return { accessToken: token, user: this.toAuthUser(user) };
  }

  // Localiza o atendente a partir do identificador do dono: tenta clínica (por id
  // ou customCode) e, em seguida, profissional (por id). Retorna null se nenhum
  // corresponder ao username informado.
  private async resolveAttendant(
    identifier: string,
    username: string,
  ): Promise<UserDocument | null> {
    if (Types.ObjectId.isValid(identifier)) {
      const byClinic = await this.usersService.findByClinicIdAndUsername(identifier, username);
      if (byClinic) return byClinic;
      const byProfessional = await this.usersService.findByProfessionalIdAndUsername(
        identifier,
        username,
      );
      if (byProfessional) return byProfessional;
    }

    const clinic = await this.clinicModel
      .findOne({ customCode: identifier })
      .select('_id')
      .exec();
    if (clinic) {
      return this.usersService.findByClinicIdAndUsername(clinic._id.toString(), username);
    }

    return null;
  }

  async logout(userId: string): Promise<void> {
    await this.redisService.removeToken(userId);
  }

  private async createPatientDocument(userId: string, dto: SignupDto): Promise<void> {
    if (!dto.phone) {
      throw new BadRequestException('Telefone é obrigatório para pacientes');
    }

    // Data de nascimento é opcional (informação de contexto). Quando vier,
    // valida que é uma data plausível.
    let dob: Date | undefined;
    if (dto.dateOfBirth) {
      dob = new Date(dto.dateOfBirth);
      const ageYears = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (ageYears < 0 || ageYears > MAX_AGE_YEARS) {
        throw new BadRequestException('Data de nascimento inválida');
      }
    }

    await this.patientModel.create({
      userId: new Types.ObjectId(userId),
      name: dto.name,
      ...(dob ? { dateOfBirth: dob } : {}),
      phone: this.normalizePhone(dto.phone),
      gender: dto.gender,
      pronouns: dto.pronouns,
      cep: dto.cep,
      city: dto.city,
      state: dto.state,
    });
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private toAuthUser(user: UserDocument): AuthUser {
    return {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      username: user.username,
      clinicId: user.clinicId?.toString(),
      professionalId: user.professionalId?.toString(),
      name: user.displayName,
    };
  }

  private signToken(userId: string, role: Role): string {
    return this.jwtService.sign({ sub: userId, role });
  }
}
