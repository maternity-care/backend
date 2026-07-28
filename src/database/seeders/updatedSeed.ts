// import { DataSource, DeepPartial, EntityTarget, ObjectLiteral } from 'typeorm';
// import dataSource from '../typeorm.config';

// interface SeedTable<T extends ObjectLiteral> {
//   name: string;
//   entity: EntityTarget<T>;
//   data: DeepPartial<T>[];
//   chunk?: number;
// }

// async function insertTableData<T extends ObjectLiteral>(
//   connection: DataSource,
//   config: SeedTable<T>,
// ): Promise<T[]> {
//   if (config.data.length === 0) {
//     console.log(`Bỏ qua ${config.name}: không có dữ liệu.`);
//     return [];
//   }

//   const repository = connection.getRepository(config.entity);

//   const result = await repository.save(config.data, {
//     chunk: config.chunk ?? 100,
//     reload: true,
//   });

//   console.log(`Đã chèn thành công ${result.length} bản ghi vào ${config.name}.`);

//   return result;
// }

// async function insertCustomData(connection: DataSource): Promise<void> {
//   await connection.transaction(async (manager) => {
//     await insertFacilitiesAndRooms(manager);
//     // await insertPregnancyProfiles(manager);
//     // await insertAppointments(manager);
//     // await insertMedicalRecords(manager);
//     // await insertMedicalFiles(manager);
//   });
// }

// async function seedCustomData(): Promise<void> {
//   try {
//     await dataSource.initialize();
//     console.log('Kết nối với database thành công.');

//     // Các bảng độc lập hoặc bảng cha chạy trước
//     await new RolesAndPermissionsSeeder(dataSource).run();
//     await new UsersSeeder(dataSource).run();

//     // Các bảng có quan hệ khóa ngoại chạy sau
//     await insertFacilitiesAndRooms(dataSource);

//     // Thêm các hàm khác tại đây
//     // await insertPregnancyProfiles(dataSource);
//     // await insertAppointments(dataSource);
//     // await insertMedicalRecords(dataSource);
//     // await insertMedicalFiles(dataSource);

//     console.log('Tất cả dữ liệu đã được chèn thành công!');
//   } catch (error: unknown) {
//     console.error('Lỗi khi chèn dữ liệu:', error);
//     process.exitCode = 1;
//   } finally {
//     if (dataSource.isInitialized) {
//       await dataSource.destroy();
//       console.log('Đã đóng kết nối database.');
//     }
//   }
// }

// void seedCustomData();
