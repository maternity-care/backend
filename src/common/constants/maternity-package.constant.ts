export const MATERNITY_PACKAGE_CONSTANT = {
  CREATED: 'Tạo gói dịch vụ thành công',
  UPDATED: 'Cập nhật gói dịch vụ thành công',
  DELETED: 'Xóa gói dịch vụ thành công',
  FOUND: 'Lấy danh sách gói dịch vụ thành công',
  DETAIL_FOUND: 'Lấy chi tiết gói dịch vụ thành công',
  NOT_FOUND: 'Không tìm thấy gói dịch vụ',
  CODE_EXISTS: 'Mã gói dịch vụ đã tồn tại',
  NAME_EXISTS: 'Tên gói dịch vụ đã tồn tại',
  FACILITY_SERVICE_INVALID: 'Dịch vụ tại cơ sở không hợp lệ',
  FACILITY_SERVICE_UNAVAILABLE: 'Dịch vụ tại cơ sở đang ngừng cung cấp',
  FACILITY_SERVICE_NOT_IN_PACKAGE_FACILITY:
    'Dịch vụ trong gói phải thuộc cùng cơ sở với gói',
  PACKAGE_ITEM_DUPLICATED: 'Gói không được chứa trùng một dịch vụ tại cơ sở trong cùng một nhóm',
  QUANTITY_SERVICES_REQUIRED: 'Gói theo số lượt phải có danh sách dịch vụ ở services',
  SCHEDULE_STAGES_REQUIRED: 'Gói theo lịch trình phải có danh sách mốc/lộ trình ở stages',
  SCHEDULE_ROOT_SERVICES_INVALID:
    'Gói theo lịch trình không nhập services ở root, hãy nhập dịch vụ trong từng stage',
  STAGE_SERVICES_REQUIRED: 'Mỗi mốc/lộ trình trong gói phải có ít nhất một dịch vụ',
  STAGE_WEEK_REQUIRED: 'Mốc tuần thai phải có weekFrom và weekTo',
  STAGE_WEEK_RANGE_INVALID: 'weekFrom phải nhỏ hơn hoặc bằng weekTo',
};
