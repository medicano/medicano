import { Controller, Get, Query } from '@nestjs/common';

import { CitiesService, City } from './cities.service';
import { SearchCitiesQueryDto } from './dto/search-cities-query.dto';

@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Get()
  search(@Query() query: SearchCitiesQueryDto): Promise<City[]> {
    return this.citiesService.search(query.q ?? '');
  }
}
