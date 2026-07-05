import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GeocodeAddressQueryDto, OpenMapQueryDto } from './dto/map-query.dto';
import { MapsService } from './maps.service';

// Nhóm hai endpoint dưới tag Maps trên Swagger.
@ApiTags('Maps')
// Prefix chung của module là /maps.
@Controller('maps')
export class MapsController {
  // NestJS inject MapsService để controller chỉ xử lý HTTP, không chứa logic gọi provider.
  constructor(private readonly mapsService: MapsService) {}

  /** Tạo URL OpenStreetMap từ latitude/longitude đã được DTO kiểm tra. */
  @Get('open-url')
  @ApiOperation({ summary: 'Create an OpenStreetMap URL from coordinates' })
  createOpenMapUrl(@Query() query: OpenMapQueryDto) {
    // Giữ cùng response shape message/data với các module còn lại.
    return {
      message: 'Tạo đường dẫn bản đồ thành công',
      data: {
        // Chuyển input đã validate xuống service để tạo URL.
        mapUrl: this.mapsService.createOpenMapUrl(query.latitude, query.longitude, query.zoom),
      },
    };
  }

  /** Nhận địa chỉ từ query string và trả tọa độ tương ứng. */
  @Get('geocode')
  @ApiOperation({ summary: 'Convert an address to coordinates' })
  async geocodeAddress(@Query() query: GeocodeAddressQueryDto) {
    // Await service vì geocoding có thể đọc cache hoặc gọi HTTP bên ngoài.
    return {
      message: 'Chuyển địa chỉ thành tọa độ thành công',
      data: await this.mapsService.geocodeAddress(query.address, query.countryCode),
    };
  }
}
