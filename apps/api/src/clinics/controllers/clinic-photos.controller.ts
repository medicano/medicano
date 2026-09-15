import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';

import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { ParseMongoIdPipe } from '../../common/pipes/parse-mongo-id.pipe';
import { RemoveClinicPhotoDto } from '../dto/remove-clinic-photo.dto';
import { ClinicPhotosService } from '../services/clinic-photos.service';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

@Controller('clinics/:clinicId/photos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CLINIC)
export class ClinicPhotosController {
  constructor(private readonly clinicPhotosService: ClinicPhotosService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, _file, cb) => {
          const clinicId = (req.params as Record<string, string>).clinicId;
          const dir = join(process.cwd(), 'uploads', 'clinics', clinicId);
          if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
          }
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        cb(null, ALLOWED_MIME_TYPES.includes(file.mimetype));
      },
    }),
  )
  async upload(
    @Param('clinicId', ParseMongoIdPipe) clinicId: string,
    @CurrentUser() userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Nenhum arquivo enviado, ou tipo/tamanho não permitido (jpeg/png/webp, até 5MB)',
      );
    }
    const publicPath = `/uploads/clinics/${clinicId}/${file.filename}`;
    const photos = await this.clinicPhotosService.addPhoto(clinicId, userId, publicPath);
    return { photos };
  }

  @Delete()
  async remove(
    @Param('clinicId', ParseMongoIdPipe) clinicId: string,
    @CurrentUser() userId: string,
    @Body() dto: RemoveClinicPhotoDto,
  ) {
    const photos = await this.clinicPhotosService.removePhoto(clinicId, userId, dto.path);
    return { photos };
  }
}
