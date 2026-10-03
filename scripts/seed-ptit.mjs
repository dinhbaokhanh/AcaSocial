import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { programs, sourceRows, topicSeeds } from './seed/ptit-catalog.mjs';

const { values } = parseArgs({ options: {
  apply: { type: 'boolean', default: false }, output: { type: 'string' },
  'with-discussions': { type: 'boolean', default: false },
  'clear-discussions': { type: 'boolean', default: false },
  container: { type: 'string', default: 'acasocial-postgres' },
  'db-user': { type: 'string', default: 'postgres' },
  'identity-db': { type: 'string', default: 'db' },
} });
if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(values['identity-db'])) throw new Error('Invalid identity database name.');
const asOf = '2026-10-01T00:00:00.000Z';
const namespace = Buffer.from('9f467e1378905bcaa343e12184a0b0b1', 'hex');
function id(key) {
  const hash = createHash('sha1').update(namespace).update(key).digest().subarray(0, 16);
  hash[6] = (hash[6] & 0x0f) | 0x50; hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.toString('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
const passwordHash = '$2b$10$SlUG7zs.s.75Ks.Z1kEgnO5zTFPUJoMMO7cHAug9Ev623wENmWZIG';
const bootstrapAdmin = {
  id:id('ptit-seed-admin'), username:'campus_admin', full_name:'Nguyễn Minh An',
  date_of_birth:'1975-01-01', email:'admin@campus.acasocial.test', password_hash:passwordHash,
  avatar_url:'https://i.pravatar.cc/150?img=1', privacy:'private', is_verified:true,
  role:'admin', password_changed_at:null, last_login_at:null, created_at:asOf,
  updated_at:asOf, deleted_at:null,
};
const q = value => value === null || value === undefined ? 'NULL' : typeof value === 'number' ? String(value) : typeof value === 'boolean' ? (value ? 'TRUE' : 'FALSE') : `'${(typeof value === 'object' ? JSON.stringify(value) : String(value)).replaceAll("'", "''")}'`;
const ident = name => `"${name.replaceAll('"','""')}"`;
function insert(table, row, conflict = '(id)') {
  const columns = Object.keys(row);
  return `INSERT INTO ${ident(table)} (${columns.map(ident).join(',')}) VALUES (${columns.map(c => q(row[c])).join(',')}) ON CONFLICT ${conflict} DO NOTHING;`;
}
const studentNames = ['Nguyễn Minh Anh','Trần Quốc Bảo','Lê Thu Hà','Phạm Đức Long','Vũ Khánh Linh','Đặng Hoàng Nam','Bùi Ngọc Mai','Đỗ Gia Huy','Hoàng Phương Thảo','Ngô Thành Đạt','Dương Hải Yến','Phan Tuấn Kiệt'];
const studentTemplates = Array.from({ length:36 }, (_, index) => ({
  ...bootstrapAdmin, role:'student', username:`ptit_student_${String(index + 1).padStart(3, '0')}`,
  full_name:studentNames[index % studentNames.length], email:`ptit_student_${String(index + 1).padStart(3, '0')}@campus.acasocial.test`,
  date_of_birth:`${2002 + index % 4}-09-01`, privacy:'public', is_verified:true,
}));
const authorsByMajor = new Map();
const ptitAuthorUsers = [];
programs.forEach((program, majorIndex) => {
  const majorCode = program.major[0];
  const cohort = studentTemplates.slice(majorIndex * 12, majorIndex * 12 + 12);
  const authors = cohort.map((template, index) => {
    const username = `ptit_${majorCode}_${String(index + 1).padStart(3, '0')}`;
    const user = {
      ...template,
      id:id(`ptit-seed-user:${majorCode}:${index + 1}`),
      username,
      email:`${username}@campus.acasocial.test`,
      created_at:asOf,
      updated_at:asOf,
      last_login_at:null,
    };
    ptitAuthorUsers.push(user);
    return user;
  });
  authorsByMajor.set(majorCode, authors);
});
const authorFor = (majorCode, index) => authorsByMajor.get(majorCode)[index % authorsByMajor.get(majorCode).length].id;
const academic = new Map();
function add(table, key, row) { academic.set(`${table}:${key}`, { table, id: id(`${table}:${key}`), ...row }); }
const programsByKey = new Map();
const coursesByTitle = new Map();
const curriculumLinks = new Map();
const topicByCourse = new Map();
add('academic_sources', 'university', { url:'https://ptit.edu.vn/', title:'Học viện Công nghệ Bưu chính Viễn thông', publisher:'PTIT', accessed_at:asOf, created_at:asOf });
for (const source of sourceRows) add('academic_sources', source.key, { url:source.url, title:source.title, publisher:'PTIT', accessed_at:asOf, created_at:asOf });
add('universities', 'ptit', { code:'PTIT', name:'Học viện Công nghệ Bưu chính Viễn thông', website:'https://ptit.edu.vn/', provenance:'OFFICIAL', source_url:'https://ptit.edu.vn/', created_at:asOf, updated_at:asOf });
const universityId = id('universities:ptit');

for (const program of programs) {
  const [majorCode, majorName] = program.major;
  const majorKey = `PTIT:${majorCode}`;
  add('majors', majorCode, { university_id:universityId, code:majorCode, name:majorName, description:'Ngành đào tạo của Học viện Công nghệ Bưu chính Viễn thông.', provenance:'OFFICIAL', source_url:sourceRows.find(s=>s.key===program.source).url, status:'active', created_at:asOf, updated_at:asOf });
  const majorId = id(`majors:${majorCode}`);
  const programId = id(`training_programs:${majorCode}:${majorCode}`);
  const curriculumId = id(`curricula:${majorCode}:${program.version}`);
  programsByKey.set(program.key, { ...program, majorId, programId, curriculumId });
  add('training_programs', `${majorCode}:${majorCode}`, { major_id:majorId, program_code:program.programCode, name:program.name, program_type:program.type, admission_code:program.programCode, provenance:'OFFICIAL', source_url:sourceRows.find(s=>s.key===program.source).url, created_at:asOf, updated_at:asOf });
  add('curricula', `${majorCode}:${program.version}`, { major_id:majorId, training_program_id:programId, version:program.version, effective_year:program.year, status:'active', provenance:'SIMULATED', source_url:null, created_at:asOf, updated_at:asOf });
  for (const [order, [title, semester, credits, courseType]] of program.courses.entries()) {
    let course = coursesByTitle.get(title);
    if (!course) {
      const courseId = id(`courses:${title}`);
      course = { id:courseId, title };
      coursesByTitle.set(title, course);
      add('courses', title, { code:null, official_code:null, name:title, description:'', provenance:'SIMULATED', source_url:null, status:'active', created_at:asOf, updated_at:asOf });
    }
    const linkId = id(`curriculum_courses:${majorCode}:${title}`);
    curriculumLinks.set(`${program.key}:${title}`, { id:linkId, courseId:course.id, curriculumId:programsByKey.get(program.key).curriculumId });
    add('curriculum_courses', `${majorCode}:${title}`, { curriculum_id:programsByKey.get(program.key).curriculumId, course_id:course.id, course_type:courseType, recommended_semester:semester, display_order:order+1, credits, provenance:'SIMULATED' });
  }
}

const topicRows = [];
const rootIds = new Map();
for (const [courseTitle, entries] of Object.entries(topicSeeds)) {
  const course = coursesByTitle.get(courseTitle);
  if (!course) throw new Error(`Simulated topics refer to unknown course: ${courseTitle}`);
  const rootId = id(`topics:${courseTitle}:root`);
  const rootCode = `PTIT_${createHash('sha1').update(courseTitle).digest('hex').slice(0,10).toUpperCase()}_ROOT`;
  const root = { id:rootId, code:rootCode, name:courseTitle, description:`Phân loại chủ đề mô phỏng cho học phần ${courseTitle}.`, parent_topic_id:null, keywords:[], provenance:'SIMULATED', source_url:null, taxonomy_version:1, status:'active', created_at:asOf, updated_at:asOf };
  add('topics', `${courseTitle}:root`, root); topicRows.push(root); rootIds.set(courseTitle, rootId);
  for (const [idx, [name, keywordString]] of entries.entries()) {
    const topicId = id(`topics:${courseTitle}:${name}`);
    const code = `PTIT_${createHash('sha1').update(`${courseTitle}:${name}`).digest('hex').slice(0,12).toUpperCase()}`;
    const topic = { id:topicId, code, name, description:`Chủ đề gợi ý mô phỏng, chưa trích xuất từ đề cương chính thức của PTIT.`, parent_topic_id:rootId, keywords:keywordString.split(';').map(k=>k.trim()), provenance:'SIMULATED', source_url:null, taxonomy_version:1, status:'active', created_at:asOf, updated_at:asOf };
    add('topics', `${courseTitle}:${name}`, topic); topicRows.push(topic);
    add('course_topics', `${course.id}:${topicId}`, { course_id:course.id, topic_id:topicId, relevance_weight:1, provenance:'SIMULATED' });
    (topicByCourse.get(courseTitle) ?? topicByCourse.set(courseTitle, []).get(courseTitle)).push(topic);
  }
}

const generatedTopicTypes = [
  ['Nền tảng và thuật ngữ', 'khái niệm; định nghĩa; giả định'],
  ['Bài tập vận dụng', 'bài tập; phương pháp; kiểm tra kết quả'],
  ['Tình huống phân tích', 'tình huống; dữ kiện; giới hạn kết luận'],
  ['Thực hành và dự án', 'thực hành; quy trình; tiêu chí đánh giá'],
];
for (const [courseTitle, course] of coursesByTitle) {
  if (topicByCourse.has(courseTitle)) continue;
  const rootId = id(`topics:${courseTitle}:root`);
  const rootCode = `PTIT_${createHash('sha1').update(courseTitle).digest('hex').slice(0,10).toUpperCase()}_ROOT`;
  const root = { id:rootId, code:rootCode, name:courseTitle, description:`Phân loại chủ đề mô phỏng cho học phần ${courseTitle}.`, parent_topic_id:null, keywords:[], provenance:'SIMULATED', source_url:null, taxonomy_version:1, status:'active', created_at:asOf, updated_at:asOf };
  add('topics', `${courseTitle}:root`, root);
  topicRows.push(root);
  rootIds.set(courseTitle, rootId);
  for (const [name, keywordString] of generatedTopicTypes) {
    const topicId = id(`topics:${courseTitle}:${name}`);
    const code = `PTIT_${createHash('sha1').update(`${courseTitle}:${name}`).digest('hex').slice(0,12).toUpperCase()}`;
    const topic = { id:topicId, code, name, description:`Chủ đề gợi ý mô phỏng cho ${courseTitle}; không phải phân loại chính thức của PTIT.`, parent_topic_id:rootId, keywords:keywordString.split(';').map(k=>k.trim()), provenance:'SIMULATED', source_url:null, taxonomy_version:1, status:'active', created_at:asOf, updated_at:asOf };
    add('topics', `${courseTitle}:${name}`, topic);
    topicRows.push(topic);
    add('course_topics', `${course.id}:${topicId}`, { course_id:course.id, topic_id:topicId, relevance_weight:1, provenance:'SIMULATED' });
    (topicByCourse.get(courseTitle) ?? topicByCourse.set(courseTitle, []).get(courseTitle)).push(topic);
  }
}

const sqlGroups = [];
const academicRows = [...academic.values()];
const academicOrder = ['academic_sources','universities','majors','training_programs','courses','curricula','curriculum_courses','topics','course_topics'];
const academicStatements = [`DO $$ BEGIN IF EXISTS (SELECT 1 FROM majors m JOIN (VALUES ${programs.map(p=>`(${q(p.major[0])},${q(p.major[1])})`).join(',')}) AS x(code,name) USING(code) WHERE m.name<>x.name) THEN RAISE EXCEPTION 'PTIT major code collides with an existing differently named major'; END IF; END $$;`];
for (const table of academicOrder) for (const row of academicRows.filter(r=>r.table===table)) {
  const { table:_, ...record } = row;
  academicStatements.push(insert(table, record));
}
for (const program of programs) {
  const majorCode = program.major[0];
  const programId = id(`training_programs:${majorCode}:${majorCode}`);
  const curriculumId = id(`curricula:${majorCode}:${program.version}`);
  academicStatements.push(`UPDATE curricula SET version=${q(program.version)},effective_year=${q(program.year)},provenance='SIMULATED',source_url=NULL WHERE id=${q(curriculumId)} AND (version IS DISTINCT FROM ${q(program.version)} OR effective_year IS DISTINCT FROM ${q(program.year)} OR provenance IS DISTINCT FROM 'SIMULATED' OR source_url IS NOT NULL);`);
}
sqlGroups.push('\\connect academic_db', 'BEGIN;', ...academicStatements, 'COMMIT;');

const postScenarios = [
  ['Hệ điều hành','Deadlock','Deadlock và Banker algorithm','Trong bài tập có hai tiến trình cùng cần hai tài nguyên theo thứ tự ngược nhau, hãy chỉ ra bốn điều kiện Coffman nào xuất hiện. Banker algorithm cần thông tin gì để kết luận một trạng thái an toàn?','question'],
  ['Cấu trúc dữ liệu và giải thuật','Độ phức tạp thuật toán','Vì sao Binary Search có độ phức tạp O(log n)?','Với binary search trên mảng đã sắp xếp, mỗi bước loại bỏ một nửa đoạn tìm kiếm. Hãy lập truy hồi T(n) và giải thích vì sao số bước tỷ lệ log2(n), kể cả trường hợp biên n không phải lũy thừa của hai.','question'],
  ['Cơ sở dữ liệu','Chuẩn hóa cơ sở dữ liệu','Khi nào cần chuẩn hóa bảng dữ liệu đến 3NF?','Một bảng đơn hàng lưu lặp địa chỉ khách hàng và tên sản phẩm. Hãy xác định phụ thuộc hàm, chỉ ra nguy cơ cập nhật và đề xuất tách bảng đến 3NF; nêu rõ khóa của từng bảng sau tách.','question'],
  ['Mạng máy tính','Địa chỉ IP và Subnetting','Bài tập VLSM: chia mạng /24 cho bốn nhóm','Cho mạng 192.168.10.0/24 cần chia cho 4 phòng ban lần lượt 60, 30, 12 và 6 thiết bị. Hãy thử VLSM theo thứ tự nhu cầu lớn trước, ghi network, prefix, dải host và broadcast của từng subnet.','question'],
  ['Marketing căn bản','Định vị','Chọn trục nào để xây dựng perceptual map cho một thương hiệu mới?','Một thương hiệu sinh viên muốn định vị dịch vụ giao đồ ăn giá hợp lý quanh khu học viện. Nên chọn hai trục nào để lập perceptual map, lấy dữ liệu đối thủ ra sao, và làm thế nào tránh nhầm định vị mong muốn với nhận thức thực tế của khách hàng?','discussion'],
  ['Marketing qua phương tiện truyền thông xã hội','Chỉ số tương tác','Nên đọc reach và engagement rate cùng nhau thế nào?','Khi so sánh hiệu quả hai nội dung mạng xã hội, cần thống nhất đối tượng, khoảng thời gian và mẫu số của tỷ lệ tương tác. Nhóm nên ghi cả reach, impressions và mục tiêu chiến dịch để tránh kết luận chỉ từ một con số.','discussion'],
  ['Kiểm thử xâm nhập','Báo cáo và khắc phục','Làm sao viết báo cáo pentest có thể tái hiện an toàn?','Trong lab được cấp phép, nhóm nên mô tả phạm vi, giả định và bằng chứng tái hiện phát hiện thế nào để báo cáo có thể kiểm tra lại mà không đưa thông tin nhạy cảm vào bài đăng?','discussion'],
  ['Mật mã học cơ sở','Mật mã đối xứng','Mã hóa khác hàm băm ở điểm nào?','Hãy phân biệt mã hóa đối xứng, mã hóa khóa công khai và hàm băm qua mục tiêu bảo mật, cách quản lý khóa và trường hợp sử dụng. Vì sao không nên gọi hàm băm là mã hóa?','question'],
];
const answerScenarios = new Map([
  [0, `Một deadlock cần đồng thời đủ bốn điều kiện Coffman: loại trừ lẫn nhau, giữ và chờ, không thu hồi cưỡng bức tài nguyên, và chờ vòng tròn. Hai tiến trình lấy hai khóa theo thứ tự ngược nhau có thể tạo vòng chờ nếu mỗi tiến trình đang giữ một khóa và chờ khóa còn lại; chỉ thấy hai tiến trình cần cùng hai tài nguyên chưa đủ để kết luận deadlock nếu chưa biết trạng thái cấp phát/thứ tự chờ.

Banker cần ba bảng theo từng tiến trình và loại tài nguyên: Available, Allocation và Max; tính Need = Max - Allocation. Thử lần lượt tiến trình có Need <= Work, giả lập tiến trình hoàn tất rồi cộng Allocation của nó vào Work. Nếu có thứ tự hoàn tất tất cả tiến trình thì trạng thái an toàn; với yêu cầu mới, chỉ cấp nếu trạng thái sau cấp vẫn an toàn. Đây là thuật toán tránh deadlock dựa trên khai báo nhu cầu tối đa, không phải bộ phát hiện deadlock tổng quát.

Nguồn: MIT 6.828, Operating Systems Lecture Notes - Deadlock: https://people.csail.mit.edu/rinard/teaching/osnotes/h4.html`],
  [1, `Với mảng đã sắp xếp và truy cập chỉ số O(1), mỗi phép so sánh giữ lại nhiều nhất một nửa đoạn ứng viên. Truy hồi là T(n) = T(floor(n/2)) + Theta(1), nên số lần chia đôi là Theta(log2 n), tức thời gian tệ nhất O(log n); có thể viết chặt hơn số so sánh tệ nhất xấp xỉ floor(log2 n) + 1 tùy biến thể và quy ước trường hợp rỗng. Bộ nhớ là O(1) với bản lặp, O(log n) stack với bản đệ quy.

Điều kiện quan trọng là dữ liệu đã được sắp thứ tự theo cùng phép so sánh. Với n không phải lũy thừa của 2, floor/ceil trong kích thước nửa đoạn chỉ làm thay đổi hằng số và phép làm tròn, không đổi bậc logarit.

Nguồn: Virginia Tech OpenDSA, 1.4 Search in Sorted Arrays: https://opendsa-server.cs.vt.edu/ODSA/Books/njit/cs114/fall-2022/Sec_09/html/SortedSearch.html`],
  [2, `Nếu các phụ thuộc hàm thực tế là CustomerID -> địa chỉ hiện tại, ProductID -> tên sản phẩm, OrderID -> CustomerID và (OrderID, LineNo) -> ProductID, số lượng, đơn giá tại thời điểm mua, có thể tách thành:

- Customer(CustomerID PK, CurrentAddress)
- Product(ProductID PK, ProductName)
- Orders(OrderID PK, CustomerID FK, ShippingAddressSnapshot)
- OrderItem(OrderID FK, LineNo, ProductID FK, Quantity, UnitPriceAtSale), PK(OrderID, LineNo)

Tách này loại việc lặp tên sản phẩm và địa chỉ hiện tại trên mọi dòng đơn, giảm bất thường cập nhật. ShippingAddressSnapshot vẫn nằm ở đơn hàng nếu nghiệp vụ cần giữ địa chỉ giao tại thời điểm đặt; không nên thay nó bằng địa chỉ hiện tại của khách. 3NF yêu cầu với mỗi phụ thuộc hàm không tầm thường X -> A, X là siêu khóa hoặc A là thuộc tính khóa (prime). Cần kiểm tra tập phụ thuộc hàm đầy đủ và khóa ứng viên trước khi khẳng định lược đồ cụ thể đạt 3NF.

Nguồn: RPI CSCI 4380, Lecture 6 - Normal Forms: https://www.cs.rpi.edu/~sibel/csci4380/fall2025/lecture_notes/lecture6.html`],
  [3, `Giả sử cần số host dùng được theo quy ước subnet IPv4 thông thường (không tính network và broadcast), cấp khối lớn trước:

| Nhu cầu | Khối | Network/prefix | Host dùng được | Broadcast |
|---:|---:|---|---|---|
| 60 | 64 địa chỉ | 192.168.10.0/26 | .1 - .62 | .63 |
| 30 | 32 địa chỉ | 192.168.10.64/27 | .65 - .94 | .95 |
| 12 | 16 địa chỉ | 192.168.10.96/28 | .97 - .110 | .111 |
| 6 | 8 địa chỉ | 192.168.10.112/29 | .113 - .118 | .119 |

Các khối có kích thước lũy thừa của hai tiếp theo nhu cầu host + 2 địa chỉ dành cho network/broadcast. Bốn subnet không chồng lấn và đều nằm trong 192.168.10.0/24; còn 192.168.10.120 - 192.168.10.255 chưa cấp. Nếu số thiết bị chưa bao gồm gateway, máy in hoặc dự phòng tăng trưởng, cần cộng các thiết bị đó vào nhu cầu trước khi chọn prefix.

Nguồn: IETF RFC 4632, CIDR address blocks and prefix lengths: https://www.rfc-editor.org/rfc/rfc4632.html`],
  [7, `Mã hóa và hàm băm giải quyết mục tiêu khác nhau. Mã hóa được thiết kế để khôi phục plaintext bằng khóa phù hợp: AES là mã khối đối xứng, hai phía cùng quản lý khóa bí mật; RSAES-OAEP là một lược đồ mã hóa khóa công khai, dùng public key người nhận để mã hóa và private key tương ứng để giải mã. Thực tế thường dùng mã hóa lai để mã hóa dữ liệu lớn bằng khóa phiên đối xứng rồi bảo vệ khóa phiên bằng public-key scheme.

Hàm băm mật mã ánh xạ thông điệp độ dài tùy ý thành digest độ dài cố định và được thiết kế có tính một chiều/kháng va chạm theo mục đích sử dụng; nó không có thao tác giải mã để khôi phục thông điệp. HMAC có khóa nhưng vẫn là mã xác thực dựa trên hash, không phải mã hóa. Không lưu mật khẩu bằng SHA-256 đơn thuần; cần password-hashing/KDF chuyên dụng có salt và chi phí tính toán phù hợp.

Nguồn: NIST FIPS 197 (AES): https://csrc.nist.gov/pubs/fips/197/final ; IETF RFC 8017 (RSA encryption/decryption): https://www.rfc-editor.org/rfc/rfc8017.html ; NIST Cryptographic Hash Function glossary: https://csrc.nist.gov/glossary/term/cryptographic_hash_function ; NIST SP 800-63B-4 (password verifiers): https://pages.nist.gov/800-63-4/sp800-63b/authenticators/`],
]);
const tagRows = new Map();
const discussionStatements = ['\\connect discussion_db','BEGIN;'];
const author = ":'admin_id'";
const memberStatements = new Set();
for (const [index,[courseTitle,topicName,title,body,postType]] of postScenarios.entries()) {
  if (courseTitle==='Marketing qua phương tiện truyền thông xã hội') {
    // This course is an official optional marketing course; its topic is intentionally simulated.
  }
  const course = coursesByTitle.get(courseTitle);
  const topic = (topicByCourse.get(courseTitle) ?? []).find(t=>t.name===topicName);
  if (!course || !topic) throw new Error(`Post topic mapping missing: ${courseTitle} / ${topicName}`);
  const program = programs.find(p=>p.courses.some(c=>c[0]===courseTitle));
  const programId = programsByKey.get(program.key);
  const link = curriculumLinks.get(`${program.key}:${courseTitle}`);
  const roomId = id(`ptit-room:${courseTitle}`);
  const postAuthor = authorFor(program.major[0], index);
  memberStatements.add(`INSERT INTO room_memberships (id,room_id,user_id,role,status,assigned_by,joined_at,expires_at) VALUES (${q(id(`ptit-sample-room-member:${roomId}:${postAuthor}`))},${q(roomId)},${q(postAuthor)},'member','active',${author},${q(asOf)},NULL) ON CONFLICT(id) DO NOTHING;`);
  const postId = id(`ptit-discussion:${index}:${courseTitle}:${topicName}`);
  const tagId = id(`ptit-tag:${topic.code}`);
  const slug = `ptit-topic-${topic.code.toLowerCase()}`;
  if (!tagRows.has(tagId)) {
    tagRows.set(tagId, { id:tagId, name:`${topicName} · ${courseTitle}`, slug, description:`Chủ đề mô phỏng liên quan đến học phần ${courseTitle}.`, usage_count:0, status:'active', created_at:asOf, updated_at:asOf });
  }
  discussionStatements.push(`INSERT INTO rooms (id,slug,name,description,room_type,parent_room_id,visibility,membership_policy,posting_policy,status,created_by,start_at,end_at,rules_version,created_at,updated_at) VALUES (${q(roomId)},${q(`ptit-course-${createHash('sha1').update(courseTitle).digest('hex').slice(0,10)}`)},${q(courseTitle)},${q(`Trao đổi mô phỏng cho học phần ${courseTitle}.`)},'course',NULL,'public','open','members','active',${author},NULL,NULL,1,${q(asOf)},${q(asOf)}) ON CONFLICT(id) DO NOTHING;`);
  discussionStatements.push(insert('room_academic_bindings',{ id:id(`ptit-binding:${courseTitle}`), room_id:roomId, major_id:programId.majorId, curriculum_id:programId.curriculumId, course_id:course.id, curriculum_course_id:link.id }));
  discussionStatements.push(`INSERT INTO room_memberships (id,room_id,user_id,role,status,assigned_by,joined_at,expires_at) VALUES (${q(id(`ptit-room-member:${courseTitle}`))},${q(roomId)},${author},'owner','active',${author},${q(asOf)},NULL) ON CONFLICT(id) DO NOTHING;`);
  discussionStatements.push(insert('room_rules',{ id:id(`ptit-room-rule:${courseTitle}`), room_id:roomId, rule_code:'LEARNING_CONTEXT', title:'Trao đổi học tập có bối cảnh', description:'Bài viết mẫu mô phỏng để kiểm tra quan hệ dữ liệu; trao đổi tôn trọng và nêu giả định.', severity:'medium', version:1, active:true }));
  discussionStatements.push(insert('tags',tagRows.get(tagId)));
  discussionStatements.push(`INSERT INTO discussions (id,title,content,post_type,status,author_id,room_id,major_id,curriculum_id,course_id,curriculum_course_id,is_anonymous,upvote_count,downvote_count,comment_count,answer_count,view_count,content_version,content_provenance,created_at,updated_at,deleted_at) VALUES (${q(postId)},${q(`[Mô phỏng] ${title}`)},${q(`${body}\n\n[Seed mô phỏng, không phải tư liệu chính thức của PTIT.]`)},${q(postType)},'open',${q(postAuthor)},${q(roomId)},${q(programId.majorId)},${q(programId.curriculumId)},${q(course.id)},${q(link.id)},false,0,0,0,0,0,1,'SIMULATED',${q(asOf)},${q(asOf)},NULL) ON CONFLICT(id) DO UPDATE SET author_id=EXCLUDED.author_id;`);
  discussionStatements.push(`INSERT INTO discussion_revisions (id,discussion_id,content_version,title,content,revision_type,edited_by,created_at) VALUES (${q(id(`ptit-revision:${postId}`))},${q(postId)},1,${q(`[Mô phỏng] ${title}`)},${q(`${body}\n\n[Seed mô phỏng, không phải tư liệu chính thức của PTIT.]`)},'semantic',${q(postAuthor)},${q(asOf)}) ON CONFLICT(id) DO NOTHING;`);
  const answerContent = answerScenarios.get(index);
  if (postType === 'question' && answerContent) {
    const answerId = id(`ptit-answer:${postId}`);
    const programForAnswer = programs.find(item => item.courses.some(course => course[0] === courseTitle));
    const answerAuthor = authorFor(programForAnswer.major[0], index + 5);
    discussionStatements.push(`INSERT INTO answers (id,discussion_id,author_id,content,is_anonymous,content_version,upvote_count,downvote_count,created_at,updated_at,deleted_at) VALUES (${q(answerId)},${q(postId)},${q(answerAuthor)},${q(answerContent)},false,1,0,0,${q(asOf)},${q(asOf)},NULL) ON CONFLICT(id) DO NOTHING;`);
    discussionStatements.push(`INSERT INTO answer_revisions (id,answer_id,content_version,content,revision_type,edited_by,created_at) VALUES (${q(id(`ptit-answer-revision:${postId}`))},${q(answerId)},1,${q(answerContent)},'semantic',${q(answerAuthor)},${q(asOf)}) ON CONFLICT(id) DO NOTHING;`);
    discussionStatements.push(`UPDATE discussions SET answer_count=(SELECT count(*) FROM answers WHERE discussion_id=${q(postId)} AND deleted_at IS NULL) WHERE id=${q(postId)};`);
  }
  discussionStatements.push(`INSERT INTO discussion_tags (discussion_id,tag_id) VALUES (${q(postId)},${q(tagId)}) ON CONFLICT DO NOTHING;`);
  discussionStatements.push(`INSERT INTO discussion_tag_assignments (id,discussion_id,tag_id,topic_id,content_version,source,status,confidence,model_version,reviewed_by,parent_assignment_id,created_at) VALUES (${q(id(`ptit-topic-assignment:${postId}`))},${q(postId)},${q(tagId)},${q(topic.id)},1,'author','accepted',NULL,NULL,NULL,NULL,${q(asOf)}) ON CONFLICT(id) DO NOTHING;`);
}
const generatedActivities = [
  { kind:'concept', type:'question', title:'Gỡ rối khái niệm', body:(course, topic) => `Trong môn **${course}**, mình đang ôn **${topic}** nhưng dễ nhầm nó với một số khái niệm gần nhau.\n\nMọi người có thể giải thích bằng một ví dụ ngắn, chỉ ra điểm giống/khác và nêu điều kiện khiến cách giải thích đó không còn đúng?` },
  { kind:'exercise', type:'question', title:'Bài tập tự luyện', body:(course, topic) => `Mình muốn có một bài tự luyện về **${topic}** trong học phần **${course}**.\n\nHãy đề xuất dữ kiện nhỏ, yêu cầu đầu ra rõ ràng và gợi ý cách tự kiểm tra kết quả bằng một trường hợp biên. Chưa cần đưa đáp án hoàn chỉnh để mọi người cùng thử.` },
  { kind:'case', type:'discussion', title:'Mổ xẻ tình huống', body:(course, topic) => `Một tình huống giả định trong môn **${course}** có dữ kiện liên quan đến **${topic}**, nhưng nhóm đang đưa ra hai kết luận khác nhau.\n\nNên tách dữ kiện, giả định và suy luận thế nào để tìm điểm bất đồng? Có phản ví dụ nào làm kết luận thay đổi không?` },
  { kind:'practice', type:'discussion', title:'Đề xuất bài thực hành', body:(course, topic) => `Nhóm mình đang phác thảo một hoạt động thực hành nhỏ cho **${course}**, xoay quanh **${topic}**.\n\nMọi người góp ý giúp mục tiêu, các bước thực hiện, tiêu chí đánh giá và giới hạn phạm vi. Nếu có thể, hãy đề xuất cách ghi lại kết quả để nhóm khác tái lập được.` },
  { kind:'compare', type:'question', title:'So sánh hai cách tiếp cận', body:(course, topic) => `Với chủ đề **${topic}** trong **${course}**, khi nào nên chọn cách tiếp cận A thay vì B?\n\nHãy nêu tiêu chí so sánh như giả định đầu vào, độ phức tạp, chi phí hoặc khả năng kiểm chứng; nếu cần, thay A/B bằng hai phương pháp cụ thể mà bạn đang học.` },
  { kind:'debug', type:'question', title:'Tìm lỗi trong lời giải', body:(course, topic) => `Mình có một lời giải/bản thiết kế liên quan đến **${topic}** của môn **${course}**, nhưng chưa biết nên rà soát từ đâu.\n\nMọi người thường kiểm tra lỗi giả định, thứ tự bước, đơn vị/dữ liệu đầu vào và kết quả trung gian như thế nào? Chia sẻ một checklist ngắn hoặc lỗi thường gặp nhé.` },
  { kind:'project', type:'discussion', title:'Ý tưởng mini-project', body:(course, topic) => `Mình muốn biến **${topic}** trong học phần **${course}** thành một mini-project vừa sức trong một tuần.\n\nGợi ý giúp câu hỏi mục tiêu, sản phẩm bàn giao, dữ liệu/tài nguyên tối thiểu, cách chia việc và tiêu chí đánh giá. Phạm vi nên đủ nhỏ để kiểm chứng được kết quả.` },
  { kind:'exam', type:'question', title:'Lập kế hoạch ôn tập', body:(course, topic) => `Mình đang lên kế hoạch ôn **${course}**, bắt đầu từ **${topic}**.\n\nNếu chỉ có một buổi, nên chia thời gian cho phần hiểu khái niệm, tự làm bài và rà lỗi ra sao? Mọi người có thể gợi ý một câu hỏi tự kiểm tra mà không cần dựa vào đề thi thật không?` },
  { kind:'resources', type:'discussion', title:'Chia sẻ cách học và tài liệu', body:(course, topic) => `Mọi người có phương pháp học hoặc nguồn tham khảo mở nào hữu ích cho **${topic}** trong **${course}** không?\n\nKhi chia sẻ, ghi giúp loại tài liệu, phần kiến thức hỗ trợ và cách kiểm tra độ tin cậy; tránh đăng tài liệu nội bộ hoặc nội dung có bản quyền nếu chưa được phép.` },
];
let generatedDiscussionCount = 0;
for (const program of programs) {
  const majorCode = program.major[0];
  const programContext = programsByKey.get(program.key);
  for (const [courseIndex, [courseTitle, semester, credits, courseType]] of program.courses.entries()) {
    const course = coursesByTitle.get(courseTitle);
    const link = curriculumLinks.get(`${program.key}:${courseTitle}`);
    const topics = topicByCourse.get(courseTitle) ?? [];
    const roomId = id(`ptit-room:${majorCode}:${courseTitle}`);
    const roomSlug = `ptit-${majorCode}-${createHash('sha1').update(courseTitle).digest('hex').slice(0,10)}`;
    discussionStatements.push(`INSERT INTO rooms (id,slug,name,description,room_type,parent_room_id,visibility,membership_policy,posting_policy,status,created_by,start_at,end_at,rules_version,created_at,updated_at) VALUES (${q(roomId)},${q(roomSlug)},${q(`${courseTitle} · ${majorCode}`)},${q(`Không gian seed mô phỏng cho học phần ${courseTitle} trong chương trình ${program.name}.`)},'course',NULL,'public','open','members','active',${author},NULL,NULL,1,${q(asOf)},${q(asOf)}) ON CONFLICT(id) DO NOTHING;`);
    discussionStatements.push(insert('room_academic_bindings',{ id:id(`ptit-binding:${majorCode}:${courseTitle}`), room_id:roomId, major_id:programContext.majorId, curriculum_id:programContext.curriculumId, course_id:course.id, curriculum_course_id:link.id }));
    discussionStatements.push(`INSERT INTO room_memberships (id,room_id,user_id,role,status,assigned_by,joined_at,expires_at) VALUES (${q(id(`ptit-room-member:${majorCode}:${courseTitle}`))},${q(roomId)},${author},'owner','active',${author},${q(asOf)},NULL) ON CONFLICT(id) DO NOTHING;`);
    for (let authorIndex = 0; authorIndex < generatedActivities.length; authorIndex++) {
      const memberId = authorFor(majorCode, courseIndex * generatedActivities.length + authorIndex);
      memberStatements.add(`INSERT INTO room_memberships (id,room_id,user_id,role,status,assigned_by,joined_at,expires_at) VALUES (${q(id(`ptit-room-member:${roomId}:${memberId}`))},${q(roomId)},${q(memberId)},'member','active',${author},${q(asOf)},NULL) ON CONFLICT(id) DO NOTHING;`);
    }
    discussionStatements.push(insert('room_rules',{ id:id(`ptit-room-rule:${majorCode}:${courseTitle}`), room_id:roomId, rule_code:'LEARNING_CONTEXT', title:'Trao đổi học tập có bối cảnh', description:'Nêu giả định, cách kiểm tra và giới hạn; nội dung seed được mô phỏng, không đại diện kết luận chính thức.', severity:'medium', version:1, active:true }));
    for (const [activityIndex, activity] of generatedActivities.entries()) {
      const topic = topics[activityIndex % topics.length];
      const postId = id(`ptit-generated-discussion:${program.key}:${courseTitle}:${activity.kind}`);
      const tagId = id(`ptit-tag:${topic.code}`);
      const tag = { id:tagId, name:`${topic.name} · ${courseTitle}`, slug:`ptit-topic-${topic.code.toLowerCase()}`, description:`Chủ đề mô phỏng cho học phần ${courseTitle}.`, usage_count:0, status:'active', created_at:asOf, updated_at:asOf };
      if (!tagRows.has(tagId)) {
        tagRows.set(tagId, tag);
        discussionStatements.push(insert('tags', tag));
      }
      const title = `[Mô phỏng] ${activity.title} · ${courseTitle}: ${topic.name}`;
      const body = `${activity.body(courseTitle, topic.name, { major:program.major[1], semester })}\n\nThông tin học phần trong dữ liệu nền: ${credits ?? 'chưa công bố'} tín chỉ, tính chất ${courseType === 'required' ? 'bắt buộc' : 'tự chọn'}. Chủ đề và câu hỏi trong bài này do seed tạo để minh họa, không phải đề cương hay tài liệu chính thức.\n\n[Seed mô phỏng, không phải tư liệu chính thức của PTIT.]`;
      const postAuthor = authorFor(majorCode, courseIndex * generatedActivities.length + activityIndex);
      discussionStatements.push(`INSERT INTO discussions (id,title,content,post_type,status,author_id,room_id,major_id,curriculum_id,course_id,curriculum_course_id,is_anonymous,upvote_count,downvote_count,comment_count,answer_count,view_count,content_version,content_provenance,created_at,updated_at,deleted_at) VALUES (${q(postId)},${q(title)},${q(body)},${q(activity.type)},'open',${q(postAuthor)},${q(roomId)},${q(programContext.majorId)},${q(programContext.curriculumId)},${q(course.id)},${q(link.id)},false,0,0,0,0,0,1,'SIMULATED',${q(asOf)},${q(asOf)},NULL) ON CONFLICT(id) DO UPDATE SET author_id=EXCLUDED.author_id;`);
      discussionStatements.push(`INSERT INTO discussion_revisions (id,discussion_id,content_version,title,content,revision_type,edited_by,created_at) VALUES (${q(id(`ptit-generated-revision:${postId}`))},${q(postId)},1,${q(title)},${q(body)},'semantic',${q(postAuthor)},${q(asOf)}) ON CONFLICT(id) DO NOTHING;`);
      discussionStatements.push(`INSERT INTO discussion_tags (discussion_id,tag_id) VALUES (${q(postId)},${q(tagId)}) ON CONFLICT DO NOTHING;`);
      discussionStatements.push(`INSERT INTO discussion_tag_assignments (id,discussion_id,tag_id,topic_id,content_version,source,status,confidence,model_version,reviewed_by,parent_assignment_id,created_at) VALUES (${q(id(`ptit-generated-assignment:${postId}`))},${q(postId)},${q(tagId)},${q(topic.id)},1,'author','accepted',NULL,NULL,NULL,NULL,${q(asOf)}) ON CONFLICT(id) DO NOTHING;`);
      generatedDiscussionCount++;
    }
  }
}
if (!values['with-discussions']) {
  discussionStatements.length = 0;
  discussionStatements.push('\\connect discussion_db', 'BEGIN;');
  for (const program of programs) {
    const majorCode = program.major[0];
    const context = programsByKey.get(program.key);
    const majorRoomId = id(`ptit-major-room:${majorCode}`);
    const majorSlug = `ptit-major-${majorCode.toLowerCase()}`;
    discussionStatements.push(`INSERT INTO rooms (id,slug,name,description,room_type,parent_room_id,visibility,membership_policy,posting_policy,status,created_by,start_at,end_at,rules_version,created_at,updated_at) VALUES (${q(majorRoomId)},${q(majorSlug)},${q(program.major[1])},${q(`Không gian trao đổi học tập ngành ${program.major[1]} tại PTIT.`)},'major',NULL,'public','open','members','active',${q(bootstrapAdmin.id)},NULL,NULL,1,${q(asOf)},${q(asOf)}) ON CONFLICT(id) DO NOTHING;`);
    discussionStatements.push(insert('room_academic_bindings', { id:id(`ptit-major-room-binding:${majorCode}`), room_id:majorRoomId, major_id:context.majorId, curriculum_id:null, course_id:null, curriculum_course_id:null }));
    discussionStatements.push(`INSERT INTO room_memberships (id,room_id,user_id,role,status,assigned_by,joined_at,expires_at) VALUES (${q(id(`ptit-major-room-owner:${majorCode}`))},${q(majorRoomId)},${q(bootstrapAdmin.id)},'owner','active',${q(bootstrapAdmin.id)},${q(asOf)},NULL) ON CONFLICT(id) DO NOTHING;`);
    discussionStatements.push(`INSERT INTO room_rules (id,room_id,rule_code,title,description,severity,version,active) VALUES (${q(id(`ptit-major-room-rule:${majorCode}`))},${q(majorRoomId)},'LEARNING_CONTEXT','Trao đổi học tập có bối cảnh','Nêu giả định, cách kiểm tra và giới hạn; tôn trọng nội quy cộng đồng.','medium',1,true) ON CONFLICT(id) DO NOTHING;`);
    for (const [courseTitle] of program.courses) {
      const course = coursesByTitle.get(courseTitle);
      const link = curriculumLinks.get(`${program.key}:${courseTitle}`);
      const roomId = id(`ptit-course-room:${program.key}:${courseTitle}`);
      const slug = `ptit-course-${majorCode.toLowerCase()}-${createHash('sha1').update(courseTitle).digest('hex').slice(0,10)}`;
      discussionStatements.push(`INSERT INTO rooms (id,slug,name,description,room_type,parent_room_id,visibility,membership_policy,posting_policy,status,created_by,start_at,end_at,rules_version,created_at,updated_at) VALUES (${q(roomId)},${q(slug)},${q(`${courseTitle} · ${majorCode}`)},${q(`Không gian trao đổi học tập cho học phần ${courseTitle} thuộc ngành ${program.major[1]} tại PTIT.`)},'course',${q(majorRoomId)},'public','open','members','active',${q(bootstrapAdmin.id)},NULL,NULL,1,${q(asOf)},${q(asOf)}) ON CONFLICT(id) DO NOTHING;`);
      discussionStatements.push(insert('room_academic_bindings', { id:id(`ptit-course-room-binding:${program.key}:${courseTitle}`), room_id:roomId, major_id:context.majorId, curriculum_id:context.curriculumId, course_id:course.id, curriculum_course_id:link.id }));
      discussionStatements.push(`INSERT INTO room_memberships (id,room_id,user_id,role,status,assigned_by,joined_at,expires_at) VALUES (${q(id(`ptit-course-room-owner:${program.key}:${courseTitle}`))},${q(roomId)},${q(bootstrapAdmin.id)},'owner','active',${q(bootstrapAdmin.id)},${q(asOf)},NULL) ON CONFLICT(id) DO NOTHING;`);
      discussionStatements.push(`INSERT INTO room_rules (id,room_id,rule_code,title,description,severity,version,active) VALUES (${q(id(`ptit-course-room-rule:${program.key}:${courseTitle}`))},${q(roomId)},'LEARNING_CONTEXT','Trao đổi học tập có bối cảnh','Nêu giả định, cách kiểm tra và giới hạn; nội dung và học phần trong dữ liệu seed có thể được mô phỏng.','medium',1,true) ON CONFLICT(id) DO NOTHING;`);
    }
  }
  for (const topic of topicRows.filter(row => row.parent_topic_id !== null)) {
    const courseTitle = [...topicByCourse].find(([, topics]) => topics.some(item => item.id === topic.id))?.[0];
    if (!courseTitle) throw new Error(`Could not resolve course for topic ${topic.code}`);
    const tagId = id(`ptit-tag:${topic.code}`);
    const tagName = `${topic.name} · ${courseTitle}`;
    if (tagName.length > 100) throw new Error(`PTIT topic tag exceeds 100 characters: ${tagName}`);
    const tag = { id:tagId, name:tagName, slug:`ptit-topic-${topic.code.toLowerCase()}`, description:`Chủ đề mô phỏng cho học phần ${courseTitle}.`, usage_count:0, status:'active', created_at:asOf, updated_at:asOf };
    tagRows.set(tagId, tag);
    discussionStatements.push(insert('tags', tag));
  }
}
if (values['clear-discussions']) {
  discussionStatements.splice(2, 0,
    'DELETE FROM votes;',
    'DELETE FROM answer_acceptances;',
    'DELETE FROM answer_revisions;',
    'DELETE FROM answers;',
    'DELETE FROM comments;',
    'DELETE FROM discussion_media;',
    'DELETE FROM discussion_tags;',
    'DELETE FROM discussion_revisions;',
    'DELETE FROM discussions;',
    'UPDATE tags SET usage_count=0;'
  );
}
discussionStatements.push('COMMIT;');
sqlGroups.push(...discussionStatements);
const bootstrapAdminSql = insert('users', bootstrapAdmin, '').replace('ON CONFLICT  DO NOTHING', 'ON CONFLICT DO NOTHING');
const authorUserSql = values['with-discussions'] ? ptitAuthorUsers.map(user => insert('users', user)).join('\n') : '';
const membershipSql = values['with-discussions'] ? [...memberStatements].join('\n') : '';
const sql = `\\set ON_ERROR_STOP on\n\\encoding UTF8\n\\connect ${values['identity-db']}\nBEGIN;\n${bootstrapAdminSql}\n${authorUserSql}\nCOMMIT;\nSELECT id AS admin_id FROM users WHERE email='admin@campus.acasocial.test' AND role='admin' AND deleted_at IS NULL ORDER BY created_at LIMIT 1 \\gset\n${sqlGroups.join('\n')}\n${membershipSql}\n`;
const stats = {
  university:1, majors:programs.length, programs:programs.length,
  courses:coursesByTitle.size, curriculumCourses:academicRows.filter(r=>r.table==='curriculum_courses').length,
  topics:topicRows.length, simulatedTopics:topicRows.filter(t=>t.provenance==='SIMULATED').length,
  majorRooms:values['with-discussions'] ? 0 : programs.length,
  courseRooms:values['with-discussions'] ? 0 : academicRows.filter(row=>row.table==='curriculum_courses').length,
  official:academicRows.filter(r=>r.provenance==='OFFICIAL').length,
  derived:academicRows.filter(r=>r.provenance==='DERIVED').length,
  simulated:academicRows.filter(r=>r.provenance==='SIMULATED').length,
  tags:tagRows.size,
  sampleDiscussions:values['with-discussions'] ? postScenarios.length : 0, generatedDiscussions:values['with-discussions'] ? generatedDiscussionCount : 0,
  sourceBackedAnswers:values['with-discussions'] ? answerScenarios.size : 0,
  simulatedDiscussions:values['with-discussions'] ? postScenarios.length + generatedDiscussionCount : 0,
};
console.log(JSON.stringify(stats,null,2));
if (values.output) { await writeFile(values.output,sql,'utf8'); console.log(`SQL written to ${values.output}`); }
if (values.apply) {
  const result = spawnSync('docker',['exec','-i',values.container,'psql','-X','-q','-U',values['db-user'],'-d',values['identity-db'],'-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',windowsHide:true,maxBuffer:4*1024*1024});
  if (result.status!==0) throw new Error(`psql failed (${result.status}): ${result.stderr || result.stdout}`);
  console.log(`PTIT academic seed applied${values['with-discussions'] ? ' with sample discussions' : ' with catalog topic tags only'}${values['clear-discussions'] ? '; existing discussion content cleared' : ''}.`);
} else if (!values.output) console.log('Validation only. Use --apply to add the data.');
