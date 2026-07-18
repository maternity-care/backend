import { plainToInstance } from 'class-transformer';
import { ActiveStatus } from '../../../../common/constants/status.enum';
import { DoctorResponseDto } from './doctor-response.dto';

describe('DoctorResponseDto', () => {
  it('exposes doctor profile fields for API responses', () => {
    const dto = plainToInstance(DoctorResponseDto, {
      id: '1',
      staffId: '10',
      licenseNo: 'LIC-001',
      title: 'BS. CKI',
      specialty: 'Sản phụ khoa',
      yearsOfExperience: 12,
      bio: 'Chuyên về sản phụ khoa',
      status: ActiveStatus.ACTIVE,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-02-01T00:00:00.000Z'),
    });

    expect(dto).toEqual(
      expect.objectContaining({
        id: '1',
        staffId: '10',
        licenseNo: 'LIC-001',
        title: 'BS. CKI',
        specialty: 'Sản phụ khoa',
        yearsOfExperience: 12,
        bio: 'Chuyên về sản phụ khoa',
        status: ActiveStatus.ACTIVE,
      }),
    );
  });
});
