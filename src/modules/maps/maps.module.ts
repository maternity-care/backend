import { Module } from '@nestjs/common';
import { MapsController } from './maps.controller';
import { MapsService } from './maps.service';

// Module gom controller và service bản đồ thành một đơn vị độc lập.
// Đăng ký các HTTP endpoint /maps/*.
// Cho phép NestJS khởi tạo và inject MapsService.
// Export để FacilitiesModule có thể tái sử dụng geocoding trong tương lai.
@Module({
  controllers: [MapsController],
  providers: [MapsService],
  exports: [MapsService],
})
export class MapsModule {}
