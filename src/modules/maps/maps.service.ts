import { createHash } from 'crypto';
import {
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IRedisCacheService,
  REDIS_CACHE_SERVICE,
} from '../../common/cache/redis-cache.interface';


//cache có nghĩa là lưu trữ tạm thời các kết quả geocode để giảm số lần gọi ra dịch vụ bên ngoài,
//đặc biệt là Nominatim.

/** Cấu trúc tối thiểu của một kết quả do Nominatim trả về. */
interface NominatimSearchResult {
  // Vĩ độ được Nominatim trả về dưới dạng chuỗi để không làm mất độ chính xác.
  lat: string;
  // Kinh độ được Nominatim trả về dưới dạng chuỗi.
  lon: string;
  // Tên địa điểm đầy đủ đã được nhà cung cấp chuẩn hóa.
  display_name: string;
  // Hộp bao địa lý theo thứ tự south, north, west, east.
  boundingbox: string[];
  // Loại đối tượng OSM, ví dụ node, way hoặc relation.
  osm_type: string;
  // ID của đối tượng trong OpenStreetMap.
  osm_id: number;
}

/** Kết quả geocode mà backend trả cho client. */
export interface GeocodeResult {
  // Vĩ độ của địa chỉ tìm thấy.
  latitude: string;
  // Kinh độ của địa chỉ tìm thấy.
  longitude: string;
  // Tên địa chỉ chuẩn hóa để UI có thể hiển thị lại cho người dùng xác nhận.
  displayName: string;
  // Vùng bao quanh địa điểm, hữu ích khi cần fit bản đồ.
  boundingBox: string[];
  // Loại đối tượng OpenStreetMap.
  osmType: string;
  // ID đối tượng OpenStreetMap.
  osmId: number;
  // URL có thể mở trực tiếp vị trí trên trang OpenStreetMap.
  mapUrl: string;
}

@Injectable()
export class MapsService {
  // Endpoint search chính thức của public Nominatim server.
  private static readonly NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
  // Cache kết quả trong 24 giờ để giảm request ra dịch vụ bên ngoài.
  private static readonly CACHE_TTL_SECONDS = 24 * 60 * 60;
  // Ghi lại thời điểm request gần nhất để giới hạn tối đa khoảng 1 request/giây.
  private lastNominatimRequestAt = 0;

  constructor(
    // ConfigService cung cấp tên ứng dụng và website để tạo User-Agent nhận diện được.
    private readonly configService: ConfigService,
    // Redis cache được inject qua token để service không phụ thuộc implementation cụ thể.
    @Inject(REDIS_CACHE_SERVICE)
    private readonly cache: IRedisCacheService,
  ) {}

  /**
   * Tạo URL mở OpenStreetMap từ tọa độ.
   * Hàm này không gọi mạng; nó chỉ xây dựng một URL an toàn cho frontend.
   */
  createOpenMapUrl(latitude: string, longitude: string, zoom = 16): string {
    // Encode giá trị trước khi ghép URL để tránh ký tự đặc biệt làm hỏng query string.
    const lat = encodeURIComponent(latitude);
    // Kinh độ cũng phải được encode độc lập.
    const lon = encodeURIComponent(longitude);
    // mlat/mlon đặt marker; phần #map điều khiển zoom và tâm bản đồ.
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`;
  }

  /**
   * Chuyển địa chỉ dạng chữ thành tọa độ qua Nominatim.
   * Luồng xử lý: chuẩn hóa input -> kiểm tra cache -> gọi provider -> chuẩn hóa output -> cache.
   */
  async geocodeAddress(address: string, countryCode?: string): Promise<GeocodeResult> {
    // Xóa khoảng trắng thừa để cùng một địa chỉ tạo cùng cache key.
    // Country code được chuẩn hóa về chữ thường theo dạng mà Nominatim chấp nhận.
    // Tạo cache key từ địa chỉ và quốc gia đã chuẩn hóa.
    // Ưu tiên lấy cache để phản hồi nhanh và tránh lạm dụng public API.
    const normalizedAddress = address.trim().replace(/\s+/g, ' ');
    const normalizedCountryCode = countryCode?.trim().toLowerCase();
    const cacheKey = this.createCacheKey(normalizedAddress, normalizedCountryCode);
    const cached = await this.getCached(cacheKey);
    // Có cache thì trả ngay, không gọi Nominatim.
    if (cached) return cached;
    // Chờ nếu request trước đó xảy ra chưa đủ một giây.
    // URL class tự encode query parameter chính xác hơn nối chuỗi thủ công.
    await this.respectPublicRateLimit();
    
    const url = new URL(MapsService.NOMINATIM_URL);
    // q là địa chỉ tìm kiếm tự do.
    url.searchParams.set('q', normalizedAddress);
    // jsonv2 là format JSON ổn định của Nominatim search API.
    url.searchParams.set('format', 'jsonv2');
    // Chỉ cần kết quả phù hợp nhất cho luồng nhập địa chỉ Facility.
    url.searchParams.set('limit', '1');
    // Yêu cầu provider trả thêm chi tiết địa chỉ nếu cần mở rộng response sau này.
    url.searchParams.set('addressdetails', '1');
    // Chỉ thêm bộ lọc quốc gia khi client có truyền countryCode.
    if (normalizedCountryCode) {
      url.searchParams.set('countrycodes', normalizedCountryCode);
    }

    // Khai báo response ngoài try để sử dụng tiếp sau khi request thành công.
    let response: Response;
    try {
      // Ghi thời điểm ngay trước khi gọi để request kế tiếp tính rate limit chính xác.
      // Gọi Nominatim bằng fetch có sẵn trong Node.js hiện tại.
      this.lastNominatimRequestAt = Date.now();
      response = await fetch(url, {
        headers: {
          // Yêu cầu response JSON.
          // Ưu tiên tên địa điểm tiếng Việt, sau đó mới đến tiếng Anh.
          // Public Nominatim yêu cầu User-Agent nhận diện được ứng dụng gọi API.
          'Accept': 'application/json',
          'Accept-Language': 'vi,en;q=0.8',
          'User-Agent': this.getUserAgent(),
        },
        // Hủy request nếu provider không trả lời trong vòng 8 giây.
        signal: AbortSignal.timeout(8_000),
      });
    } catch {
      throw new ServiceUnavailableException('Dịch vụ bản đồ hiện không phản hồi');
    }

    // HTTP status khác 2xx được coi là provider đang lỗi hoặc từ chối request.
    if (!response.ok) {
      throw new ServiceUnavailableException(`Dịch vụ bản đồ trả về lỗi ${response.status}`);
    }
    // Parse JSON và mô tả kiểu dữ liệu mà provider dự kiến trả về.
    const results = await response.json() as NominatimSearchResult[];
    // Mảng rỗng nghĩa là địa chỉ hợp lệ về cú pháp nhưng không tìm thấy trên bản đồ.
    if (!Array.isArray(results) || results.length === 0) {
      throw new NotFoundException('Không tìm thấy tọa độ phù hợp với địa chỉ');
    }

    // limit=1 nên chỉ sử dụng kết quả đầu tiên và phù hợp nhất.
    const first = results[0];
    // Chuyển field snake_case của Nominatim sang camelCase của API backend.
    const result: GeocodeResult = {
      latitude: first.lat,
      longitude: first.lon,
      displayName: first.display_name,
      boundingBox: first.boundingbox,
      osmType: first.osm_type,
      osmId: first.osm_id,
      // Tạo luôn URL bản đồ để frontend không phải tự ghép lại.
      mapUrl: this.createOpenMapUrl(first.lat, first.lon),
    };
    // Lưu kết quả thành công; kết quả not-found không được cache trong phiên bản này.
    await this.setCached(cacheKey, result);
    return result;
  }

  /** Tạo cache key ngắn và không lưu nguyên văn địa chỉ nhạy cảm trong tên key Redis. */
  // Ghép quốc gia vào input để cùng địa chỉ ở hai quốc gia không dùng nhầm cache.
  // Namespace giúp dễ quản lý hoặc xóa nhóm cache maps.
  private createCacheKey(address: string, countryCode?: string): string {
    const hash = createHash('sha256').update(`${countryCode ?? ''}|${address.toLowerCase()}`).digest('hex');
    return `maps:geocode:${hash}`;
  }

  /** Đọc cache an toàn; Redis lỗi không được làm API geocode thất bại. */
  private async getCached(key: string): Promise<GeocodeResult | null> {
    try {
      return await this.cache.get<GeocodeResult>(key);
    } catch {
      // Cache chỉ là tối ưu hóa, vì vậy fallback sang gọi provider.
      return null;
    }
  }

  /** Ghi cache theo kiểu best-effort. */
  private async setCached(key: string, value: GeocodeResult): Promise<void> {
    try {
      // TTL 24 giờ cân bằng giữa độ mới của dữ liệu và lượng request bên ngoài.
      // Geocoding vẫn trả kết quả khi cache tạm thời không khả dụng.
      await this.cache.set(key, value, MapsService.CACHE_TTL_SECONDS);
    } catch {
      
    }
  }

  /** Giãn cách các request public Nominatim trong cùng một process. */
  private async respectPublicRateLimit(): Promise<void> {
    // remaining dương nghĩa là chưa đủ một giây kể từ request trước.
    const remaining = 1_000 - (Date.now() - this.lastNominatimRequestAt);
    if (remaining > 0) {
      // Chỉ chờ phần thời gian còn thiếu, không chặn lâu hơn cần thiết.
      await new Promise(resolve => setTimeout(resolve, remaining));
    }
  }

  /** Tạo User-Agent nhận diện ứng dụng theo yêu cầu sử dụng Nominatim. */
  private getUserAgent(): string {
    // Lấy tên ứng dụng từ config và có fallback an toàn cho development.
    const appName = this.configService.get<string>('app.name') ?? 'Maternity Care API';
    // Website/contact giúp nhà cung cấp xác định bên vận hành ứng dụng.
    const website = this.configService.get<string>('app.frontendUrl') ?? 'http://localhost';
    return `${appName}/1.0 (${website})`;
  }
}
