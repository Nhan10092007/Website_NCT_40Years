const cohortDuration = 3;
const foundingYear = 1986;

function generateCohorts() {
  const cohorts = [];
  const currentYear = new Date().getFullYear();

  for (let year = currentYear; year >= foundingYear; year--) {
    const endYear = year + cohortDuration;
    const cohort = `${year}-${endYear}`;
    cohorts.push(cohort);
  }
  return cohorts;
}

function isValidCohort(cohort) {
  const availableCohorts = generateCohorts();
  return availableCohorts.includes(cohort);
}

/**
 * Chuyển đổi thông minh các từ khóa niên khóa người dùng nhập:
 * - 2 chữ số: "19" -> niên khóa "2019-2022", "19-22"
 * - 4 chữ số: "2019" -> niên khóa "2019-2022", "19-22"
 * - Dạng gạch nối: "19-22" -> "2019-2022"
 * - Giúp người dùng gõ tắt linh hoạt mà vẫn tìm đúng niên khóa 3 năm.
 */
function resolveCohortVariants(input) {
  if (!input || typeof input !== 'string') return [];
  const trimmed = input.trim();
  if (!trimmed) return [];

  const variants = new Set();

  // 1. Dạng 2 chữ số: "19", "86", "05"
  if (/^\d{2}$/.test(trimmed)) {
    const num = parseInt(trimmed, 10);
    const startYear = num >= 86 ? 1900 + num : 2000 + num;
    const endYear = startYear + cohortDuration;
    const end2Digits = String(endYear).slice(-2);

    variants.add(`%${startYear}-${endYear}%`);
    variants.add(`%${startYear} - ${endYear}%`);
    variants.add(`%${trimmed}-${end2Digits}%`);
    variants.add(`%${trimmed} - ${end2Digits}%`);
    variants.add(`%${startYear}%`);
  }

  // 2. Dạng 4 chữ số: "2019", "1995"
  else if (/^\d{4}$/.test(trimmed)) {
    const startYear = parseInt(trimmed, 10);
    const endYear = startYear + cohortDuration;
    const start2Digits = String(startYear).slice(-2);
    const end2Digits = String(endYear).slice(-2);

    // Người dùng gõ năm nhập học (phổ biến nhất): 2019 -> 2019-2022
    variants.add(`%${startYear}-${endYear}%`);
    variants.add(`%${startYear} - ${endYear}%`);
    variants.add(`%${start2Digits}-${end2Digits}%`);
    variants.add(`%${startYear}%`);

    // Dự phòng người dùng gõ năm tốt nghiệp: 2019 -> 2016-2019
    const gradStartYear = startYear - cohortDuration;
    if (gradStartYear >= foundingYear) {
      variants.add(`%${gradStartYear}-${startYear}%`);
      variants.add(`%${gradStartYear} - ${startYear}%`);
    }
  }

  // 3. Dạng rút gọn: "19-22" hoặc "19 - 22"
  else if (/^(\d{2})\s*-\s*(\d{2})$/.test(trimmed)) {
    const match = trimmed.match(/^(\d{2})\s*-\s*(\d{2})$/);
    const start2 = parseInt(match[1], 10);
    const end2 = parseInt(match[2], 10);
    const startYear = start2 >= 86 ? 1900 + start2 : 2000 + start2;
    const endYear = end2 >= 86 ? 1900 + end2 : 2000 + end2;

    variants.add(`%${startYear}-${endYear}%`);
    variants.add(`%${startYear} - ${endYear}%`);
    variants.add(`%${match[1]}-${match[2]}%`);
  }

  // Luôn giữ biến thể gốc
  variants.add(`%${trimmed}%`);

  return Array.from(variants);
}

export { generateCohorts, isValidCohort, resolveCohortVariants };