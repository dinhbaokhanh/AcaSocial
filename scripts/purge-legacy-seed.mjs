import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { buildDataset } from './seed/community.mjs';

const { values } = parseArgs({ options: {
  apply: { type: 'boolean', default: false },
  'confirm-delete-legacy-seed': { type: 'boolean', default: false },
  container: { type: 'string', default: 'acasocial-postgres' },
  'db-user': { type: 'string', default: 'postgres' },
  'identity-db': { type: 'string', default: 'db' },
} });
const seed = buildDataset({ asOf: '2026-10-01T00:00:00Z' });
const q = (db, sql) => execFileSync('docker', ['exec', '-i', values.container, 'psql', '-X', '-qAt', '-U', values['db-user'], '-d', db, '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 }).trim();
const idList = rows => rows.map(row => `'${row.id}'`).join(',');
const fixed = (prefix, numbers) => numbers.map(number => `'${prefix}${String(number).padStart(12, '0')}'`).join(',');
const curatedPostIds = fixed('50000000-0000-4000-8000-', Array.from({ length: 14 }, (_, i) => i + 1));
const curatedRoomIds = fixed('30000000-0000-4000-8000-', [1, 2, 10, 11, 101, 102, 103, 104, 105, 106, 201]);
const curatedMajorIds = fixed('20000000-0000-4000-8000-', [1, 2]);
const curatedCourseIds = fixed('21000000-0000-4000-8000-', Array.from({ length: 6 }, (_, i) => i + 1));
const curatedCurriculumIds = fixed('22000000-0000-4000-8000-', [1, 2]);
const curatedTopicIds = fixed('24000000-0000-4000-8000-', Array.from({ length: 7 }, (_, i) => i + 1));
const curatedAnswerIds = fixed('60000000-0000-4000-8000-', Array.from({ length: 7 }, (_, i) => i + 1));
const curatedCommentIds = fixed('70000000-0000-4000-8000-', Array.from({ length: 8 }, (_, i) => i + 1));

// The identities were part of the old generator, but are intentionally retained.
const posts = seed.discussion.discussions;
const comments = seed.discussion.comments;
const answers = seed.discussion.answers;
const postIds = idList(posts);
const commentIds = idList(comments);
const answerIds = idList(answers);
const expectedPostCounts = new Map(posts.map(post => [post.id, {
  comments: comments.filter(row => row.discussion_id === post.id).length,
  answers: answers.filter(row => row.discussion_id === post.id).length,
  post,
}]));

const protectionSql = `
CREATE TEMP TABLE old_seed_posts(id uuid PRIMARY KEY, title text, content text, author_id uuid, status text, updated_at timestamptz, comment_count integer, answer_count integer);
INSERT INTO old_seed_posts VALUES ${posts.map(({ id, title, content, author_id, status, updated_at, comment_count, answer_count }) => `('${id}','${title.replaceAll("'", "''")}','${content.replaceAll("'", "''")}','${author_id}','${status}','${updated_at}',${comment_count},${answer_count})`).join(',')};
CREATE TEMP TABLE old_seed_comments(id uuid PRIMARY KEY, discussion_id uuid, content text, author_id uuid, updated_at timestamptz);
INSERT INTO old_seed_comments VALUES ${comments.map(row => `('${row.id}','${row.discussion_id}','${row.content.replaceAll("'", "''")}','${row.author_id}','${row.updated_at}')`).join(',')};
CREATE TEMP TABLE old_seed_answers(id uuid PRIMARY KEY, discussion_id uuid, content text, author_id uuid, updated_at timestamptz);
INSERT INTO old_seed_answers VALUES ${answers.map(row => `('${row.id}','${row.discussion_id}','${row.content.replaceAll("'", "''")}','${row.author_id}','${row.updated_at}')`).join(',')};
CREATE TEMP TABLE protected_posts AS
SELECT s.id FROM old_seed_posts s JOIN discussions d ON d.id=s.id
WHERE d.title IS DISTINCT FROM s.title OR d.content IS DISTINCT FROM s.content OR d.author_id IS DISTINCT FROM s.author_id
 OR d.status::text IS DISTINCT FROM s.status OR d.updated_at IS DISTINCT FROM s.updated_at
 OR d.comment_count IS DISTINCT FROM s.comment_count OR d.answer_count IS DISTINCT FROM s.answer_count
 OR EXISTS (SELECT 1 FROM comments c WHERE c.discussion_id=s.id AND NOT EXISTS (SELECT 1 FROM old_seed_comments x WHERE x.id=c.id AND x.content=c.content AND x.author_id=c.author_id AND x.updated_at=c.updated_at))
 OR EXISTS (SELECT 1 FROM answers a WHERE a.discussion_id=s.id AND NOT EXISTS (SELECT 1 FROM old_seed_answers x WHERE x.id=a.id AND x.content=a.content AND x.author_id=a.author_id AND x.updated_at=a.updated_at))
 OR EXISTS (SELECT 1 FROM votes v WHERE v.target_id=s.id AND v.target_type::text='discussion' AND v.id NOT IN (${idList(seed.discussion.votes.filter(v => v.target_type === 'discussion'))}))
 OR EXISTS (SELECT 1 FROM discussion_media m WHERE m.discussion_id=s.id);
SELECT id FROM protected_posts;
SELECT 'post_fields', count(*) FROM old_seed_posts s JOIN discussions d ON d.id=s.id WHERE d.title IS DISTINCT FROM s.title OR d.content IS DISTINCT FROM s.content OR d.author_id IS DISTINCT FROM s.author_id OR d.status::text IS DISTINCT FROM s.status OR d.updated_at IS DISTINCT FROM s.updated_at OR d.comment_count IS DISTINCT FROM s.comment_count OR d.answer_count IS DISTINCT FROM s.answer_count;
SELECT 'custom_or_changed_children', count(DISTINCT s.id) FROM old_seed_posts s WHERE EXISTS (SELECT 1 FROM comments c WHERE c.discussion_id=s.id AND NOT EXISTS (SELECT 1 FROM old_seed_comments x WHERE x.id=c.id AND x.content=c.content AND x.author_id=c.author_id AND x.updated_at=c.updated_at)) OR EXISTS (SELECT 1 FROM answers a WHERE a.discussion_id=s.id AND NOT EXISTS (SELECT 1 FROM old_seed_answers x WHERE x.id=a.id AND x.content=a.content AND x.author_id=a.author_id AND x.updated_at=a.updated_at));
SELECT 'extra_votes', count(DISTINCT v.target_id) FROM votes v WHERE v.target_id IN (${postIds}) AND v.target_type::text='discussion' AND v.id NOT IN (${idList(seed.discussion.votes.filter(v => v.target_type === 'discussion'))});
SELECT 'with_media', count(DISTINCT m.discussion_id) FROM discussion_media m WHERE m.discussion_id IN (${postIds});
`;

const protectionResult = q('discussion_db', protectionSql);
const protectedIds = new Set(protectionResult.split(/\r?\n/).filter(line => /^[0-9a-f-]{36}$/i.test(line)));
const existingCommunityIds = new Set(q('discussion_db', `SELECT id FROM discussions WHERE id IN (${postIds});`).split(/\r?\n/).filter(line => /^[0-9a-f-]{36}$/i.test(line)));
const eligiblePosts = posts.filter(post => !protectedIds.has(post.id));
const protectedContextResult = protectedIds.size ? q('discussion_db', `SELECT id,room_id,major_id,curriculum_id,course_id,curriculum_course_id FROM discussions WHERE id IN (${[...protectedIds].map(id => `'${id}'`).join(',')});`) : '';
const protectedContexts = protectedContextResult.split(/\r?\n/).filter(Boolean).map(line => line.split('|'));
const protectedContextValues = new Set(protectedContexts.flatMap(([, roomId, majorId, curriculumId, courseId, curriculumCourseId]) => [roomId, majorId, curriculumId, courseId, curriculumCourseId]).filter(Boolean));
const eligibleIds = eligiblePosts.map(row => `'${row.id}'`).join(',') || "'00000000-0000-0000-0000-000000000000'";
const eligiblePostSet = new Set(eligiblePosts.map(row => row.id));
const eligibleComments = comments.filter(row => eligiblePostSet.has(row.discussion_id));
const eligibleAnswers = answers.filter(row => eligiblePostSet.has(row.discussion_id));
const eligibleTargets = [...eligiblePosts, ...eligibleComments, ...eligibleAnswers].map(row => `'${row.id}'`).join(',') || "'00000000-0000-0000-0000-000000000000'";
const eligibleAnswerIds = eligibleAnswers.map(row => `'${row.id}'`).join(',') || "'00000000-0000-0000-0000-000000000000'";

const preview = q('discussion_db', `SELECT 'legacy_posts', count(*) FROM discussions WHERE id IN (${postIds}) UNION ALL SELECT 'protected_posts', ${protectedIds.size} UNION ALL SELECT 'eligible_posts', ${eligiblePosts.length};`);
const orphanAnswerPreview = q('discussion_db', `SELECT 'legacy_seed_answers_present',count(*) FROM answers WHERE id IN (${eligibleAnswerIds}) UNION ALL SELECT 'legacy_seed_answer_revisions',count(*) FROM answer_revisions WHERE answer_id IN (${eligibleAnswerIds}) UNION ALL SELECT 'legacy_seed_acceptances',count(*) FROM answer_acceptances WHERE answer_id IN (${eligibleAnswerIds});`);
const currentCuratedIds = q('discussion_db', `SELECT id FROM discussions WHERE id IN (${curatedPostIds});`).split(/\r?\n/).filter(line => /^[0-9a-f-]{36}$/i.test(line));
const eligibleCuratedIds = currentCuratedIds;
const eligibleCuratedList = eligibleCuratedIds.map(id => `'${id}'`).join(',') || "'00000000-0000-0000-0000-000000000000'";
const curatedPreview = `curated_seed_posts|${currentCuratedIds.length}\neligible_curated_posts|${eligibleCuratedIds.length}`;
console.log(`Preserving all ${seed.identity.users.length} legacy-seed accounts and all other users.`);
console.log(preview);
console.log(`Protected edited community posts: ${protectedIds.size}; eligible old seed IDs (including orphan descendants): ${eligiblePosts.length}; currently present posts: ${existingCommunityIds.size}.`);
console.log(orphanAnswerPreview);
console.log(curatedPreview);
console.log(protectionResult.split(/\r?\n/).filter(line => line.includes('|')).join('\n'));
console.log('PTIT content is outside the deterministic legacy ID set and will not be targeted.');
if (!values.apply) {
  console.log('Dry run only. Review the protected/eligible counts above; pass --apply to delete matching old seed rows.');
  process.exit(0);
}
if (!values['confirm-delete-legacy-seed']) {
  throw new Error('Deletion requires both --apply and --confirm-delete-legacy-seed.');
}

const discussionSql = `BEGIN;
DELETE FROM votes WHERE target_id IN (${eligibleTargets});
DELETE FROM answer_acceptances WHERE discussion_id IN (${eligibleIds}) OR answer_id IN (${eligibleAnswerIds});
DELETE FROM answer_reviews WHERE answer_id IN (${eligibleAnswerIds});
DELETE FROM academic_disputes WHERE answer_id IN (${eligibleAnswerIds});
DELETE FROM answer_revisions WHERE answer_id IN (${eligibleAnswerIds});
DELETE FROM answers WHERE id IN (${eligibleAnswerIds});
DELETE FROM discussions WHERE id IN (${eligibleIds});
DELETE FROM room_academic_bindings WHERE room_id IN (${idList(seed.discussion.rooms)}) AND room_id NOT IN (${protectedContexts.map(([, roomId]) => `'${roomId}'`).join(',') || "'00000000-0000-0000-0000-000000000000'"}) AND (major_id IN (${idList(seed.academic.majors)}) OR curriculum_id IN (${idList(seed.academic.curricula)}) OR course_id IN (${idList(seed.academic.courses)}));
DELETE FROM room_rules WHERE room_id IN (${idList(seed.discussion.rooms)}) AND id IN (${idList(seed.discussion.room_rules)});
DELETE FROM room_memberships WHERE room_id IN (${idList(seed.discussion.rooms)}) AND id IN (${idList(seed.discussion.room_memberships)}) AND NOT EXISTS (SELECT 1 FROM discussions d WHERE d.room_id=room_memberships.room_id);
DO $$ DECLARE removed integer; BEGIN LOOP
  DELETE FROM rooms r WHERE r.id IN (${idList(seed.discussion.rooms)}) AND NOT EXISTS (SELECT 1 FROM discussions d WHERE d.room_id=r.id) AND NOT EXISTS (SELECT 1 FROM rooms child WHERE child.parent_room_id=r.id) AND NOT EXISTS (SELECT 1 FROM room_memberships m WHERE m.room_id=r.id);
  GET DIAGNOSTICS removed = ROW_COUNT; EXIT WHEN removed = 0;
END LOOP; END $$;
DELETE FROM tags t WHERE t.id IN (${idList(seed.discussion.tags)}) AND NOT EXISTS (SELECT 1 FROM discussion_tags dt WHERE dt.tag_id=t.id) AND NOT EXISTS (SELECT 1 FROM discussion_tag_assignments a WHERE a.tag_id=t.id);
COMMIT;`;
q('discussion_db', discussionSql);

const curatedDiscussionSql = `BEGIN;
CREATE TEMP TABLE curated_targets(id uuid PRIMARY KEY) ON COMMIT DROP;
INSERT INTO curated_targets SELECT id FROM discussions WHERE id IN (${eligibleCuratedList})
UNION SELECT id FROM answers WHERE discussion_id IN (${eligibleCuratedList})
UNION SELECT id FROM comments WHERE discussion_id IN (${eligibleCuratedList});
DELETE FROM votes WHERE target_id IN (SELECT id FROM curated_targets);
DELETE FROM answer_acceptances WHERE discussion_id IN (${eligibleCuratedList}) OR answer_id IN (SELECT id FROM answers WHERE discussion_id IN (${eligibleCuratedList}));
DELETE FROM answer_reviews WHERE answer_id IN (SELECT id FROM answers WHERE discussion_id IN (${eligibleCuratedList}));
DELETE FROM academic_disputes WHERE answer_id IN (SELECT id FROM answers WHERE discussion_id IN (${eligibleCuratedList}));
DELETE FROM answer_revisions WHERE answer_id IN (SELECT id FROM answers WHERE discussion_id IN (${eligibleCuratedList}));
DELETE FROM answers WHERE discussion_id IN (${eligibleCuratedList});
DELETE FROM discussions WHERE id IN (${eligibleCuratedList});
DELETE FROM room_academic_bindings WHERE room_id IN (${curatedRoomIds}) AND (major_id IN (${curatedMajorIds}) OR curriculum_id IN (${curatedCurriculumIds}) OR course_id IN (${curatedCourseIds}));
DELETE FROM room_rules WHERE room_id IN (${curatedRoomIds}) AND rule_code IN ('CIVILITY','SCOPE','LEARNING_CONTEXT');
DELETE FROM room_memberships WHERE room_id IN (${curatedRoomIds}) AND user_id IN (${fixed('10000000-0000-4000-8000-', [1, 2, ...Array.from({ length: 108 }, (_, i) => i + 101)])});
DO $$ DECLARE removed integer; BEGIN LOOP
  DELETE FROM rooms r WHERE r.id IN (${curatedRoomIds}) AND NOT EXISTS (SELECT 1 FROM discussions d WHERE d.room_id=r.id) AND NOT EXISTS (SELECT 1 FROM rooms child WHERE child.parent_room_id=r.id) AND NOT EXISTS (SELECT 1 FROM room_memberships m WHERE m.room_id=r.id);
  GET DIAGNOSTICS removed = ROW_COUNT; EXIT WHEN removed = 0;
END LOOP; END $$;
DELETE FROM tags t WHERE t.id IN (${fixed('40000000-0000-4000-8000-', Array.from({ length: 8 }, (_, i) => i + 1))}) AND NOT EXISTS (SELECT 1 FROM discussion_tags dt WHERE dt.tag_id=t.id) AND NOT EXISTS (SELECT 1 FROM discussion_tag_assignments a WHERE a.tag_id=t.id);
COMMIT;`;
q('discussion_db', curatedDiscussionSql);

const academicSql = `BEGIN;
DELETE FROM course_topics WHERE id IN (${idList(seed.academic.course_topics)});
DELETE FROM curriculum_courses WHERE id IN (${idList(seed.academic.curriculum_courses.filter(row => !protectedContextValues.has(row.id)))});
DO $$ DECLARE removed integer; BEGIN LOOP
  DELETE FROM topics t WHERE t.id IN (${idList(seed.academic.topics)}) AND NOT EXISTS (SELECT 1 FROM topics child WHERE child.parent_topic_id=t.id) AND NOT EXISTS (SELECT 1 FROM course_topics ct WHERE ct.topic_id=t.id);
  GET DIAGNOSTICS removed = ROW_COUNT; EXIT WHEN removed = 0;
END LOOP; END $$;
DELETE FROM curricula c WHERE c.id IN (${idList(seed.academic.curricula.filter(row => !protectedContextValues.has(row.id)))} ) AND NOT EXISTS (SELECT 1 FROM curriculum_courses cc WHERE cc.curriculum_id=c.id);
DELETE FROM courses c WHERE c.id IN (${idList(seed.academic.courses.filter(row => !protectedContextValues.has(row.id)))} ) AND NOT EXISTS (SELECT 1 FROM curriculum_courses cc WHERE cc.course_id=c.id) AND NOT EXISTS (SELECT 1 FROM course_topics ct WHERE ct.course_id=c.id);
DELETE FROM majors m WHERE m.id IN (${idList(seed.academic.majors.filter(row => !protectedContextValues.has(row.id)))} ) AND NOT EXISTS (SELECT 1 FROM curricula c WHERE c.major_id=m.id);
COMMIT;`;
q('academic_db', academicSql);

const curatedAcademicSql = `BEGIN;
DELETE FROM curriculum_courses WHERE id IN (${fixed('23000000-0000-4000-8000-', Array.from({ length: 7 }, (_, i) => i + 1))});
DELETE FROM curricula WHERE id IN (${curatedCurriculumIds}) AND major_id IN (${curatedMajorIds});
DELETE FROM courses WHERE id IN (${curatedCourseIds});
DELETE FROM topics WHERE id IN (${curatedTopicIds});
DELETE FROM majors WHERE id IN (${curatedMajorIds}) AND code IN ('CNTT','ATTT');
COMMIT;`;
q('academic_db', curatedAcademicSql);

const notificationIds = idList(seed.notification.notifications);
q('notification_db', `DELETE FROM notifications WHERE id IN (${notificationIds}) AND data->>'discussionId' IN (${eligibleIds});`);
q('notification_db', `DELETE FROM notifications WHERE id IN (${fixed('90000000-0000-4000-8000-', Array.from({ length: 20 }, (_, i) => i + 1))});`);
console.log('Legacy synthetic seed rows removed where unmodified and unreferenced. User identities, protected discussions, and PTIT rows were retained.');
