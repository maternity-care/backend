export const MEDICAL_RECORD_MESSAGES = {
  CREATED: 'Tạo hồ sơ bệnh án thành công',
  UPDATED: 'Cập nhật hồ sơ bệnh án thành công',
  DELETED: 'Xóa hồ sơ bệnh án thành công',
  FOUND: 'Lấy danh sách hồ sơ bệnh án thành công',
  DETAIL_FOUND: 'Lấy chi tiết hồ sơ bệnh án thành công',
  NOT_FOUND: 'Hồ sơ bệnh án không tồn tại',
  APPOINTMENT_NOT_FOUND: 'Lịch hẹn không tồn tại',
  APPOINTMENT_ALREADY_HAS_RECORD: 'Lịch hẹn đã có hồ sơ bệnh án',
  APPOINTMENT_DATA_MISMATCH: 'Bác sĩ hoặc hồ sơ thai không khớp với thông tin của lịch hẹn',
  DATE_RANGE_INVALID: 'createdFrom phải nhỏ hơn hoặc bằng createdTo',
  HAS_FILES: 'Không thể xóa hồ sơ bệnh án đang có tệp y tế',
} as const;
