import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ActiveStatus } from '../../common/constants/status.enum';
import { SERVICE_CONSTANT } from '../../common/constants/service.constant';
import { SafeRemoveResult } from '../../common/interfaces/safe-remove-result.interface';
import { Service } from './entities/services.entity';
import { CreateServiceDto } from './dto/requests/create-service.dto';
import { SearchServiceDto } from './dto/requests/search-service.dto';
import { UpdateServiceDto } from './dto/requests/update-service.dto';
import {
  IServicesRepository,
  SERVICES_REPOSITORY,
} from './interfaces/services-repository.interface';

@Injectable()
export class ServicesService {
  constructor(
    // Inject qua interface token để service không phụ thuộc trực tiếp vào TypeORM repository class.
    @Inject(SERVICES_REPOSITORY)
    private readonly repository: IServicesRepository,
  ) {}

  // Tạo một dịch vụ y tế gốc, ví dụ: siêu âm, xét nghiệm máu, tư vấn bác sĩ.
  async create(dto: CreateServiceDto): Promise<Service> {
    await this.ensureUniqueCode(dto.code);
    await this.ensureUniqueName(dto.name);

    const service = this.repository.create({
      ...dto,
      description: dto.description ?? undefined,
      // DB đang lưu boolean dưới dạng tinyint/number, nên ép boolean về 0/1 cho rõ ràng.
      requiresDoctorWarning: dto.requiresDoctorWarning ? 1 : 0,
    });
    return this.repository.save(service);
  }

  // Lấy danh sách dịch vụ; nếu query có page thì controller sẽ gọi hàm phân trang riêng.
  findAll(filters?: SearchServiceDto): Promise<Service[]> {
    return this.repository.findAll(filters);
  }

  // Lấy danh sách dịch vụ có phân trang cho màn hình quản trị.
  findAllPaginated(filters?: SearchServiceDto) {
    return this.repository.findAllPaginated(filters);
  }

  // Lấy chi tiết một dịch vụ; dùng chung cho detail, update, delete.
  async findById(id: string): Promise<Service> {
    const service = await this.repository.findById(id);
    if (!service) {
      throw new NotFoundException(SERVICE_CONSTANT.NOT_FOUND);
    }
    return service;
  }

  // Cập nhật dịch vụ, đồng thời chống trùng code/name nếu người dùng đổi các field đó.
  async update(id: string, dto: UpdateServiceDto): Promise<Service> {
    const service = await this.findById(id);

    if (dto.code && dto.code !== service.code) {
      await this.ensureUniqueCode(dto.code);
    }
    if (dto.name && dto.name !== service.name) {
      await this.ensureUniqueName(dto.name);
    }

    Object.assign(service, {
      ...dto,
      description: dto.description ?? service.description,
      // Chỉ ghi đè requiresDoctorWarning khi client thật sự gửi field này.
      ...(dto.requiresDoctorWarning === undefined
        ? {}
        : { requiresDoctorWarning: dto.requiresDoctorWarning ? 1 : 0 }),
    });
    return this.repository.save(service);
  }

  // Xóa an toàn: chưa ai dùng thì hard delete, đã có liên kết thì chuyển inactive để giữ lịch sử.
  async remove(id: string): Promise<SafeRemoveResult> {
    const service = await this.findById(id);
    const dependencyCount = await this.repository.countDependencies(service.id);

    if (dependencyCount === 0) {
      await this.repository.remove(service);
      return { action: 'hard_deleted', affectedCount: 0 };
    }

    await this.repository.updateStatus(service, ActiveStatus.INACTIVE);
    return { action: 'soft_deleted', affectedCount: dependencyCount };
  }

  // Kiểm tra mã dịch vụ đã tồn tại chưa; code là định danh ổn định dùng trong quản trị/tích hợp.
  private async ensureUniqueCode(code: string): Promise<void> {
    if (await this.repository.findByCode(code)) {
      throw new ConflictException(SERVICE_CONSTANT.CODE_EXISTS);
    }
  }

  // Kiểm tra tên dịch vụ để tránh tạo nhiều dịch vụ giống nhau gây rối khi chọn lịch hẹn.
  private async ensureUniqueName(name: string): Promise<void> {
    if (await this.repository.findByName(name)) {
      throw new ConflictException(SERVICE_CONSTANT.NAME_EXISTS);
    }
  }
}
