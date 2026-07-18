import {
  Column,
  Entity,
  PrimaryColumn,
} from 'typeorm';

@Entity('package_service_facilities')
export class PackageServiceFacility {
  @PrimaryColumn({ name: 'package_service_id', type: 'bigint' })
  packageServiceId: string;

  @PrimaryColumn({ name: 'facility_id', type: 'bigint' })
  facilityId: string;
}
