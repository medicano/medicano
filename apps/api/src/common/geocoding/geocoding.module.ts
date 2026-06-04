import { Global, Module } from '@nestjs/common';
import { GeocodingService } from './geocoding.service';

// Global: tanto o cadastro (auth) quanto a edição de perfil (profile) precisam
// geocodificar o endereço da clínica usando exatamente a mesma lógica.
@Global()
@Module({
  providers: [GeocodingService],
  exports: [GeocodingService],
})
export class GeocodingModule {}
