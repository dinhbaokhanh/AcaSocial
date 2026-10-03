# PTIT seed

`seed-ptit.mjs` defaults to the PTIT academic catalog, simulated course-topic
taxonomy, one bootstrap admin account, and one tag per leaf topic. It does not
create discussion posts, answers, comments, or sample author accounts.

```powershell
# Review the row counts without changing the database
node scripts/seed-ptit.mjs

# Add catalog data and topic tags
node scripts/seed-ptit.mjs --apply

# Also delete existing discussion content and reset tag usage counts
node scripts/seed-ptit.mjs --apply --clear-discussions
```

`--clear-discussions` is destructive to all discussion content in
`discussion_db`; it preserves tags, rooms, users, and the academic catalog.
Do not use it if any existing discussion content should remain.

To generate the illustrative PTIT discussions and sample authors instead, opt
in explicitly:

```powershell
node scripts/seed-ptit.mjs --with-discussions --apply
```

The current catalog includes three official PTIT program names. Its illustrative
course placements and all generated topic taxonomy rows are marked `SIMULATED`,
not official curriculum data. Program names/codes are sourced from PTIT's
[official program list](https://iqa.ptit.edu.vn/2026/04/15/cac-chuong-trinh-dao-tao/).
