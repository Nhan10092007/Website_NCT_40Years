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
      // Trong Express 5, req.query và req.params có thể có getter, dùng Object.assign
      try {
        Object.assign(req[source], result.data);
      } catch {
        // Fallback nếu object bị frozen
        req[`validated_${source}`] = result.data;
      }
    }
    next();
  };
}
