export const MEDICAL_RECORD_MESSAGES = {
  CREATED: 'Tạo kết quả khám thành công',
  UPDATED: 'Cập nhật kết quả khám thành công',
  DELETED: 'Xóa kết quả khám thành công',
  FOUND: 'Lấy danh sách kết quả khám thành công',
  DETAIL_FOUND: 'Lấy chi tiết kết quả khám thành công',
  NOT_FOUND: 'Kết quả khám không tồn tại',
  APPOINTMENT_NOT_FOUND: 'Lịch hẹn không tồn tại',
  APPOINTMENT_ALREADY_HAS_RECORD: 'Lịch hẹn đã có kết quả khám',
  APPOINTMENT_DATA_MISMATCH: 'Bác sĩ hoặc hồ sơ thai không khớp với thông tin của lịch hẹn',
  DATE_RANGE_INVALID: 'createdFrom phải nhỏ hơn hoặc bằng createdTo',
  HAS_FILES: 'Không thể xóa kết quả khám đang có tệp y tế',
} as const;
