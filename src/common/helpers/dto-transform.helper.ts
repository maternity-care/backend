
// trimText: loại bỏ khoảng trắng thừa ở đầu và cuối chuỗi, 
// đồng thời thay thế nhiều khoảng trắng liên tiếp bằng một khoảng trắng duy nhất
export function trimText(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
}

// trimValue: loại bỏ khoảng trắng thừa ở đầu và cuối chuỗi, 
// nhưng giữ nguyên khoảng trắng giữa các từ
export function trimValue(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

// normalizeCode: chuẩn hóa code bằng cách loại bỏ khoảng trắng thừa và chuyển sang chữ in hoa
export function normalizeCode(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

// normalizeWorkingDays: chuẩn hóa working_days bằng cách loại bỏ khoảng trắng thừa,
//  chuyển sang chữ in hoa và loại bỏ khoảng trắng giữa các ngày
export function normalizeWorkingDays(value: unknown): unknown {
  return typeof value === 'string'
    ? value.trim().toUpperCase().replace(/\s/g, '')
    : value;
}

