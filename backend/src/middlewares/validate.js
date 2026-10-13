export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return res.status(400).json({
        message: errors[0]?.message || 'Dữ liệu không hợp lệ',
        errors,
      });
    }

    if (source === 'body') {
      req.body = result.data;
    } else {
      // Dữ liệu đã làm sạch (ví dụ đã đổi chuỗi "5" thành số 5) luôn nằm ở
      // req.validated_query hoặc req.validated_params.
      // Không gán đè vào req.query vì từ Express 5, req.query là getter
      // tạo object mới mỗi lần đọc nên giá trị gán sẽ bị mất.
      req[`validated_${source}`] = result.data;

      // req.params là object thường nên gán thêm được, giữ để code cũ vẫn chạy
      if (source === 'params') {
        Object.assign(req.params, result.data);
      }
    }
    next();
  };
}