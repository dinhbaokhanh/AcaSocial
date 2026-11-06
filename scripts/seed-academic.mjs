// Seed ngành + môn cho academic_db ở môi trường dev (docker compose).
//
//   node scripts/seed-academic.mjs           # chỉ in kế hoạch, không ghi DB
//   node scripts/seed-academic.mjs --apply   # ghi vào DB
//
// Chạy trước scripts/seed-rooms-tags.mjs: script đó cần các mã ngành/môn dưới đây.
// Chạy lại nhiều lần an toàn: mọi INSERT đều ON CONFLICT (code) DO NOTHING, dòng đã có giữ nguyên.
// Cần: container Postgres đang chạy, academic-service đã chạy migration một lần.
//
// Toàn bộ là dữ liệu MÔ PHỎNG (provenance SIMULATED), không gắn trường nào (university_id NULL).
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    container: { type: 'string', default: 'acasocial-postgres' },
  },
});

// [mã, tên, mô tả]
const majors = [
  ['CNTT', 'Công nghệ thông tin', 'Lập trình, hệ thống máy tính, cơ sở dữ liệu, mạng và phát triển phần mềm.'],
  ['ATTT', 'An toàn thông tin', 'Bảo mật hệ thống, mật mã, kiểm thử xâm nhập và ứng phó sự cố.'],
  ['MKT', 'Marketing', 'Nghiên cứu thị trường, thương hiệu, truyền thông và marketing số.'],
];

const courses = [
  ['CTDL', 'Cấu trúc dữ liệu và giải thuật', 'Mảng, danh sách, cây, đồ thị, sắp xếp, tìm kiếm và độ phức tạp thuật toán.'],
  ['OOP', 'Lập trình hướng đối tượng', 'Lớp, đối tượng, đóng gói, kế thừa, đa hình và mẫu thiết kế.'],
  ['HDH', 'Hệ điều hành', 'Tiến trình, luồng, lập lịch, deadlock, quản lý bộ nhớ và hệ thống tệp.'],
  ['CSDL', 'Cơ sở dữ liệu', 'Mô hình quan hệ, SQL, chuẩn hóa, giao dịch và điều khiển đồng thời.'],
  ['MMT', 'Mạng máy tính', 'Mô hình phân tầng, địa chỉ IP, định tuyến, TCP/UDP và các giao thức ứng dụng.'],
  ['WEB', 'Lập trình Web', 'Xây dựng ứng dụng web: frontend, backend, API và triển khai.'],
  ['KNPM', 'Kỹ nghệ phần mềm', 'Quy trình phát triển, phân tích yêu cầu, thiết kế, kiểm thử và quản lý dự án.'],
  ['MMH', 'Mật mã học cơ sở', 'Mật mã đối xứng, mật mã khóa công khai, hàm băm và MAC.'],
  ['KTXN', 'Kiểm thử xâm nhập', 'Quy trình pentest, an toàn ứng dụng web, khai thác lỗ hổng và viết báo cáo.'],
  ['TTTN', 'Thực tập tốt nghiệp', 'Chọn nơi thực tập, giảng viên hướng dẫn, thực hiện và báo cáo kết quả.'],
  ['MKT1', 'Marketing căn bản', 'Khái niệm marketing, phân khúc, định vị, nghiên cứu thị trường và marketing mix.'],
  ['MKT2', 'Marketing mạng xã hội', 'Chiến lược nội dung số, chỉ số tương tác và quảng cáo trên mạng xã hội.'],
];

const q = (v) => `'${String(v).replaceAll("'", "''")}'`;
const id = (key) => {
  const h = createHash('sha1').update(`acasocial-seed:${key}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

function psql(sql) {
  const r = spawnSync(
    'docker',
    ['exec', '-i', values.container, 'sh', '-c', `psql -X -q -tA -F '|' -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d academic_db`],
    { input: sql, encoding: 'utf8' },
  );
  if (r.status !== 0) throw new Error(`psql academic_db lỗi:\n${r.stderr || r.error}`);
  return r.stdout.trim().split('\n').filter(Boolean).map((line) => line.split('|'));
}

const codesIn = (table) => new Set(psql(`SELECT code FROM ${table} WHERE code IS NOT NULL;`).map(([code]) => code));
const missing = (rows, existing) => rows.map(([code]) => code).filter((code) => !existing.has(code));

const newMajors = missing(majors, codesIn('majors'));
const newCourses = missing(courses, codesIn('courses'));
if (!values.apply) {
  console.log('Kế hoạch (chưa ghi DB, thêm --apply để ghi):', { majors: newMajors, courses: newCourses });
  process.exit(0);
}

const sql = ['BEGIN;'];
for (const [table, rows] of [['majors', majors], ['courses', courses]])
  for (const [code, name, description] of rows)
    sql.push(`INSERT INTO ${table} (id, code, name, description, provenance)
      VALUES (${q(id(`${table}:${code}`))}, ${q(code)}, ${q(name)}, ${q(description)}, 'SIMULATED')
      ON CONFLICT (code) DO NOTHING;`);
sql.push('COMMIT;');
psql(sql.join('\n'));

const [[majorCount, courseCount]] = psql('SELECT (SELECT count(*) FROM majors) AS majors, (SELECT count(*) FROM courses) AS courses;');
console.log(`Đã seed. Thêm ${newMajors.length} ngành, ${newCourses.length} môn. Hiện có ${majorCount} ngành, ${courseCount} môn.`);
