import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';


/// IsLaterThan: kiểm tra xem giá trị của thuộc tính hiện tại 
// có lớn hơn giá trị của thuộc tính liên quan hay không
export function IsLaterThan(
  relatedProperty: string,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isLaterThan',
      target: target.constructor,
      propertyName: propertyName.toString(),
      constraints: [relatedProperty],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const relatedValue = (args.object as Record<string, unknown>)[relatedProperty];
          if (value === undefined || relatedValue === undefined) return true;
          return typeof value === 'string' &&
            typeof relatedValue === 'string' &&
            value > relatedValue;
        },
      },
    });
  };
}

// chuỗi csv: là một chuỗi các giá trị được phân tách bằng dấu phẩy, ví dụ: "MON,TUE,WED" 
// HasUniqueCsvValues: kiểm tra xem giá trị của thuộc tính hiện tại
// có phải là một chuỗi CSV với các giá trị duy nhất hay không
export function HasUniqueCsvValues(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'hasUniqueCsvValues',
      target: target.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value === undefined || value === null) return true;
          if (typeof value !== 'string') return false;
          const values = value.split(',');
          return values.length === new Set(values).size;
        },
      },
    });
  };
}

