# FetenaX Feature Expansion — Implementation Plan

## Overview
Adding 13+ features across student and teacher roles to the existing PHP/MySQL/JS FetenaX exam platform. The codebase uses `db.php` for schema + seeding, `api.php` for all API actions, `index.php` for HTML, `script.js` for frontend, and `styles.css` for styling.

---

## Proposed Changes

### 1. Practice Mode *(Student)*
> Retake any exam with instant right/wrong feedback per question. No timer, not saved to results.

#### [MODIFY] api.php
- New action `practice_exam`: fetches exam + questions **including `correctAnswer`** but does NOT save to `results`.

#### [MODIFY] index.php
- Each exam card in student view gets a **"Practice"** button alongside "Start Exam".
- New practice interface panel (reuses exam UI but adds green/red feedback overlay per option).

#### [MODIFY] script.js
- `startPractice(examId)` function — runs same flow as `startExam()` but:
  - No timer shown (hidden)
  - On option select: immediately shows ✓/✗ per option
  - No `submit_exam` call on finish — shows local score summary modal

---

### 2. Question Bank *(Teacher)*
> Save questions to a reusable pool. Import from bank when creating an exam.

#### [MODIFY] db.php
- New table `question_bank (id, teacherId, question, option1…4, correctAnswer, subject, points, createdAt)`.

#### [MODIFY] api.php
- `teacher_bank_add` — save a question to bank
- `teacher_bank_list` — list all bank questions (filter by subject)
- `teacher_bank_delete` — delete from bank
- Modify `teacher_create_exam`: allow `bankQuestionIds[]` alongside manual questions

#### [MODIFY] index.php + script.js
- New sidebar tab **"Question Bank"** in teacher nav
- "Import from Bank" button in exam creation modal — opens a picker modal listing bank questions with checkboxes
- "Save to Bank" checkbox on each question block in the create exam form

---

### 3. Export Results CSV *(Teacher)*
> Download all attempts as a `.csv` file. Filter by exam or date before exporting.

#### [MODIFY] api.php
- New action `teacher_export_csv`: accepts optional `examId` + `dateFrom`/`dateTo` filters; outputs `Content-Type: text/csv` with proper headers.

#### [MODIFY] index.php + script.js
- In the "Review Attempts" tab, add filter controls (exam dropdown, date range pickers) and **"Export CSV"** button.
- Button opens `api.php?action=teacher_export_csv&...` directly (GET request download).

---

### 4. Edit Existing Exam *(Teacher)*
> Edit title, duration, difficulty, and individual questions after creation.

#### [MODIFY] api.php
- New action `teacher_edit_exam`: updates `exams` row + replaces all `questions` for that exam.

#### [MODIFY] index.php
- Reuses `createExamModal` with populated values (edit mode).

#### [MODIFY] script.js
- **"Edit"** button added to each exam analytics card.
- `openEditExam(examId)` — fetches existing exam + questions, populates modal, sets submit to call `teacher_edit_exam`.

---

### 5. Student Profile View *(Teacher)*
> Click any student to see a detail page: all attempts, score history, subject strength.

#### [MODIFY] api.php
- New action `teacher_student_profile`: returns student info + all their results with subject breakdown.

#### [MODIFY] index.php + script.js
- Student rows in "Students" tab become clickable.
- Clicking opens a profile panel/modal with:
  - Student info card (name, email, ID)
  - Attempt history table
  - Subject performance bar chart (same style as student's own view)

---

### 6. Leaderboard *(Student)*
> Per-exam ranking of students by score.

#### [MODIFY] api.php
- New action `get_leaderboard`: accepts `examId`, returns ranked list of student names + scores (capped at top 20 for privacy).

#### [MODIFY] index.php + script.js
- New tab **"Leaderboard"** in student sidebar nav.
- Exam selector dropdown + ranked list with medal icons for top 3.

---

### 7. Profile Settings *(Both)*
> Edit display name, change password, upload avatar initials/color from settings page.

#### [MODIFY] api.php
- New action `update_profile`: updates `name`, `avatar` (initials + color), and optionally `password` (with current password verification).

#### [MODIFY] index.php + script.js
- New tab **"Settings"** added to both student and teacher nav.
- Form with: Display Name, Avatar Color picker (HSL), New Password (optional), Current Password (required to save).

---

### 8. Bulk Student Import *(Teacher)*
> Upload a CSV (name, email, ID, password) to register many students.

#### [MODIFY] api.php
- New action `teacher_bulk_import`: accepts multipart CSV file, parses rows, hashes passwords, inserts valid students, returns a per-row result.

#### [MODIFY] index.php + script.js
- New **"Import Students"** button in the Students tab.
- Modal with file upload input + CSV format hint + result summary after upload.

---

### 9. Badges & Achievements *(Student)*
> Earn badges for milestones: first pass, perfect score, 5 exams taken, etc.

#### [MODIFY] db.php
- New table `badges (id, studentId, type, earnedAt)`. Badge types: `first_pass`, `perfect_score`, `five_exams`, `ten_exams`, `streak_3`.

#### [MODIFY] api.php
- `check_badges(studentId)` helper called after every `submit_exam` — inserts new badges.
- New action `get_badges`: returns earned badges for current student.

#### [MODIFY] index.php + script.js
- Badge showcase section in "My Performance" tab.
- Toast notification when a new badge is earned after submitting an exam.

---

### 10. PDF Score Report *(Student)*
> Download a formatted PDF of the results page.

#### [MODIFY] index.php + script.js
- **"Download PDF"** button on the results page after submitting.
- Uses `window.print()` with a `@media print` CSS that hides the back button and formats the results nicely — **no external library needed**.

#### [MODIFY] styles.css
- Add `@media print` rules for clean PDF layout.

---

### 11. Class Groups *(Teacher — Nice to have)*
> Create groups (e.g. "Class A"), assign exams to specific groups only.

#### [MODIFY] db.php
- New tables: `groups (id, teacherId, name)`, `group_members (groupId, studentId)`, `exam_groups (examId, groupId)`.

#### [MODIFY] api.php
- `teacher_create_group`, `teacher_list_groups`, `teacher_assign_group_members`, `teacher_assign_exam_to_group`.
- `get_exams` for student: filters by group membership if exam_groups exists.

#### [MODIFY] index.php + script.js
- New **"Groups"** tab in teacher nav.
- Exam creation: optional "Restrict to Group" dropdown.

---

### 12. Weighted Scoring *(Both)*
> Teachers assign different point values per question; score reflects total points earned.

> **Note:** The DB already has a `points INT DEFAULT 1` column on `questions`, and the API already reads it when fetching exam questions. This is mostly a frontend enhancement.

#### [MODIFY] script.js (create exam modal)
- Add a **"Points"** number input (min 1, default 1) to each question block in `addQuestionBlock()`.

#### [MODIFY] api.php — `submit_exam`
- Change scoring: `totalPoints = SUM(q.points)`, `earnedPoints = SUM(q.points WHERE correct)`, `score = round(earned/total * 100)`.

#### [MODIFY] index.php (exam display)
- Show "X Points" per question in both exam-taking view and results review.

---

## DB Schema Summary (new tables)

| Table | Purpose |
|---|---|
| `question_bank` | Reusable question pool |
| `badges` | Student achievement records |
| `groups` | Class/section groups |
| `group_members` | Student ↔ Group membership |
| `exam_groups` | Exam ↔ Group restriction |

---

## Verification Plan

### Automated
- Run the dev server and confirm no PHP errors on load.
- Test each API action via curl or browser.

### Manual (browser)
- Teacher: create exam with weighted points, import CSV, use question bank
- Student: take practice mode, check leaderboard, earn badge, download PDF
- Both: update profile settings
- Teacher: export CSV with filters, view student profile

---

## Open Questions

> [!IMPORTANT]
> **Priority order**: The list is large. Should I implement **all 12+ features** in one pass, or do you prefer a phased rollout starting with highest-priority items (e.g. Practice Mode, Edit Exam, CSV Export, Leaderboard, Profile Settings, Weighted Scoring)?

> [!NOTE]
> **PDF generation**: The plan uses `window.print()` with print CSS — no server-side library or external CDN needed. This produces a clean browser-native PDF. A more polished alternative would be `jsPDF` (CDN). Which do you prefer?

> [!NOTE]
> **Class Groups** is marked "Nice to have" — this involves the most schema changes. Confirm if you want it included in this implementation pass.

> [!NOTE]
> **Avatar color**: For profile settings, avatar color will be chosen from a curated palette of 8–10 colors stored as a hex string in the `users.avatar` field (e.g. `#e74c3c:AB`). Does this approach work, or should it be a separate column?
