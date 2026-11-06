// Seed tag + room cho môi trường dev (docker compose).
//
//   node scripts/seed-rooms-tags.mjs           # chỉ in kế hoạch, không ghi DB
//   node scripts/seed-rooms-tags.mjs --apply   # ghi vào DB
//
// Chạy lại nhiều lần an toàn: mọi INSERT đều ON CONFLICT DO NOTHING / cập nhật theo slug.
// Cần: container Postgres đang chạy, academic_db đã có majors/courses (scripts/seed-academic.mjs), identity DB có một admin.
//
// - academic_db.major_courses: gán môn vào ngành (MÔ PHỎNG, provenance SIMULATED).
// - discussion_db.tags: 30 nhãn trong services/ai-service/taxonomy.json + tag Marketing, gắn course_id theo course_code.
// - discussion_db.rooms: 1 room/ngành, 1 room con/môn của ngành, 1 room diễn đàn chung.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    container: { type: 'string', default: 'acasocial-postgres' },
    'identity-db': { type: 'string', default: 'db' },
  },
});

// [mã môn, học kỳ gợi ý, tín chỉ, loại]
const majorCourses = {
  CNTT: [
    ['CTDL', 3, 3, 'required'], ['OOP', 3, 3, 'required'], ['HDH', 4, 3, 'required'],
    ['CSDL', 4, 3, 'required'], ['MMT', 4, 3, 'required'], ['WEB', 5, 3, 'required'],
    ['KNPM', 5, 3, 'required'], ['MMH', 5, 3, 'elective'], ['TTTN', 8, 6, 'required'],
  ],
  ATTT: [
    ['HDH', 3, 3, 'required'], ['MMT', 3, 3, 'required'], ['CSDL', 3, 3, 'elective'],
    ['MMH', 4, 3, 'required'], ['KTXN', 6, 3, 'required'], ['TTTN', 8, 6, 'required'],
  ],
  MKT: [['MKT1', 2, 3, 'required'], ['MKT2', 5, 3, 'elective'], ['TTTN', 8, 6, 'required']],
};

// Marketing nằm ngoài phạm vi taxonomy của ai-service nhưng room Marketing vẫn cần tag để đăng bài.
const extraTags = [
  { slug: 'marketing-can-ban', name: 'Marketing căn bản', tag_id: 'dddddddd-0004-4001-8001-000000000031', course_code: 'MKT1',
    description: 'Khái niệm marketing, phân khúc, định vị, nghiên cứu thị trường, marketing mix.' },
  { slug: 'marketing-mang-xa-hoi', name: 'Marketing mạng xã hội', tag_id: 'dddddddd-0004-4001-8001-000000000032', course_code: 'MKT2',
    description: 'Chiến lược nội dung số, chỉ số tương tác (reach, engagement), quảng cáo trên mạng xã hội.' },
];

const forumRoom = {
  slug: 'goc-sinh-vien', name: 'Góc sinh viên',
  description: 'Trao đổi chung ngoài học phần: đời sống sinh viên, kinh nghiệm học tập, sự kiện.',
};

const taxonomy = JSON.parse(
  readFileSync(new URL('../services/ai-service/taxonomy.json', import.meta.url), 'utf8'),
);
const tags = [...taxonomy.tags, ...extraTags];
const missing = tags.filter((t) => !t.tag_id).map((t) => t.slug);
if (missing.length) throw new Error(`taxonomy.json thiếu tag_id: ${missing.join(', ')}`);

const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replaceAll("'", "''")}'`);
const id = (key) => {
  const h = createHash('sha1').update(`acasocial-seed:${key}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

function psql(db, sql) {
  const r = spawnSync(
    'docker',
    ['exec', '-i', values.container, 'sh', '-c', `psql -X -q -tA -F '|' -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d ${db}`],
    { input: sql, encoding: 'utf8' },
  );
  if (r.status !== 0) throw new Error(`psql ${db} lỗi:\n${r.stderr || r.error}`);
  return r.stdout.trim().split('\n').filter(Boolean).map((line) => line.split('|'));
}

// ---- Đọc dữ liệu tham chiếu ----
const [[adminId] = []] = psql(
  values['identity-db'],
  "SELECT id FROM users WHERE role = 'admin' AND deleted_at IS NULL ORDER BY created_at LIMIT 1;",
);
if (!adminId) throw new Error('Không tìm thấy tài khoản admin trong identity DB');

const majors = new Map(psql('academic_db', 'SELECT code, id, name FROM majors;').map(([c, i, n]) => [c, { id: i, name: n }]));
const courses = new Map(psql('academic_db', 'SELECT code, id, name FROM courses WHERE code IS NOT NULL;').map(([c, i, n]) => [c, { id: i, name: n }]));
for (const [major, list] of Object.entries(majorCourses)) {
  if (!majors.has(major)) throw new Error(`academic_db thiếu ngành ${major}`);
  for (const [course] of list) if (!courses.has(course)) throw new Error(`academic_db thiếu môn ${course}`);
}
for (const t of tags)
  if (t.course_code && !courses.has(t.course_code)) throw new Error(`academic_db thiếu môn ${t.course_code} của tag ${t.slug}`);

// ---- academic_db: major_courses ----
const academicSql = ['BEGIN;'];
for (const [major, list] of Object.entries(majorCourses))
  list.forEach(([course, semester, credits, type], i) =>
    academicSql.push(`INSERT INTO major_courses (id, major_id, course_id, course_type, recommended_semester, display_order, credits, provenance)
      VALUES (${q(id(`major-course:${major}:${course}`))}, ${q(majors.get(major).id)}, ${q(courses.get(course).id)}, ${q(type)}, ${semester}, ${i}, ${credits}, 'SIMULATED')
      ON CONFLICT (major_id, course_id) DO NOTHING;`));
academicSql.push('COMMIT;');

const plan = {
  majorCourses: Object.values(majorCourses).flat().length,
  tags: tags.length,
  rooms: Object.keys(majorCourses).length + Object.values(majorCourses).flat().length + 1,
};
if (!values.apply) {
  console.log('Kế hoạch (chưa ghi DB, thêm --apply để ghi):', plan);
  console.log(`Owner các room: admin ${adminId}`);
  process.exit(0);
}
psql('academic_db', academicSql.join('\n'));

// Đọc lại id thật: major_course có thể đã tồn tại từ trước với id khác.
const mcIds = new Map(
  psql('academic_db', `SELECT m.code, c.code, mc.id FROM major_courses mc
    JOIN majors m ON m.id = mc.major_id JOIN courses c ON c.id = mc.course_id;`).map(([m, c, i]) => [`${m}:${c}`, i]),
);

// ---- discussion_db: tags + rooms ----
const sql = ['BEGIN;'];
// Seed cũ dùng id kiểu dddddddd-0004-0001-0001-… (version 0, bị @IsUUID từ chối):
// đổi sang id trong taxonomy cho những tag chưa được bài viết nào tham chiếu.
for (const t of tags)
  sql.push(`UPDATE tags SET id = ${q(t.tag_id)} WHERE slug = ${q(t.slug)} AND id <> ${q(t.tag_id)}
    AND NOT EXISTS (SELECT 1 FROM discussion_tags WHERE tag_id = tags.id)
    AND NOT EXISTS (SELECT 1 FROM discussion_tag_assignments WHERE tag_id = tags.id);`);
for (const t of tags)
  sql.push(`INSERT INTO tags (id, name, slug, description, usage_count, status, course_id)
    VALUES (${q(t.tag_id)}, ${q(t.name)}, ${q(t.slug)}, ${q(t.description)}, 0, 'active', ${q(courses.get(t.course_code)?.id)})
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description,
      course_id = EXCLUDED.course_id, updated_at = now();`);

const roomId = (slug) => `(SELECT id FROM rooms WHERE slug = ${q(slug)})`;
function room({ slug, name, description, type, parent = null }, binding) {
  sql.push(`INSERT INTO rooms (id, slug, name, description, room_type, parent_room_id, visibility, membership_policy, posting_policy, status, created_by)
    VALUES (${q(id(`room:${slug}`))}, ${q(slug)}, ${q(name)}, ${q(description)}, ${q(type)}, ${parent ? roomId(parent) : 'NULL'}, 'public', 'open', 'members', 'active', ${q(adminId)})
    ON CONFLICT (slug) DO NOTHING;`);
  if (binding)
    sql.push(`INSERT INTO room_academic_bindings (id, room_id, major_id, course_id, major_course_id)
      VALUES (${q(id(`binding:${slug}`))}, ${roomId(slug)}, ${q(binding.majorId)}, ${q(binding.courseId)}, ${q(binding.majorCourseId)})
      ON CONFLICT (room_id) DO NOTHING;`);
  sql.push(`INSERT INTO room_memberships (id, room_id, user_id, role, status, assigned_by)
    VALUES (${q(id(`owner:${slug}`))}, ${roomId(slug)}, ${q(adminId)}, 'owner', 'active', ${q(adminId)})
    ON CONFLICT (room_id, user_id) DO NOTHING;`);
  sql.push(`INSERT INTO room_rules (id, room_id, rule_code, title, description, severity, version, active)
    VALUES (${q(id(`rule:${slug}`))}, ${roomId(slug)}, 'LEARNING_CONTEXT', 'Trao đổi học tập có bối cảnh',
      'Nêu rõ bối cảnh, những gì đã thử và giới hạn của câu hỏi; tôn trọng người cùng thảo luận.', 'medium', 1, true)
    ON CONFLICT (room_id, rule_code, version) DO NOTHING;`);
}

for (const [majorCode, list] of Object.entries(majorCourses)) {
  const major = majors.get(majorCode);
  const majorSlug = majorCode.toLowerCase();
  room({ slug: majorSlug, name: major.name, type: 'major',
    description: `Không gian trao đổi học tập chung của ngành ${major.name}.` },
  { majorId: major.id, courseId: null, majorCourseId: null });
  for (const [courseCode] of list) {
    const course = courses.get(courseCode);
    const slug = `${majorSlug}-${courseCode.toLowerCase()}`;
    room({ slug, name: `${course.name} · ${majorCode}`, type: 'course', parent: majorSlug,
      description: `Hỏi đáp và thảo luận học phần ${course.name} của ngành ${major.name}.` },
    { majorId: major.id, courseId: course.id, majorCourseId: mcIds.get(`${majorCode}:${courseCode}`) });
  }
}
room({ ...forumRoom, type: 'forum' }, null);
sql.push('COMMIT;');
psql('discussion_db', sql.join('\n'));

const [[roomCount, tagCount]] = psql('discussion_db', "SELECT (SELECT count(*) FROM rooms), (SELECT count(*) FROM tags WHERE status = 'active');");
console.log(`Đã seed. Hiện có ${roomCount} room, ${tagCount} tag active, ${mcIds.size} major_course.`);
