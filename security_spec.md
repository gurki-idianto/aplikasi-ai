# Security Specification & Payload-First TDD (SAPA PTK)

## 1. Data Invariants
1. **Identity Isolation (`/users/{userId}`)**: A user profile can only be read or created by the authenticated owner (`request.auth.uid == userId`) or an admin. Non-admins cannot self-assign `role: "admin"`, and `role` cannot be escalated by the user after creation.
2. **Complaint Ownership & PII Protection (`/complaints/{complaintId}`)**: Complaints contain teacher PII (`teacherEmail`, `nipOrNuptk`). Only the complaint's `authorId` or a verified admin (`isAdmin()`) may `get` or `list` a complaint.
3. **Immutable Audit Fields**: `authorId` and `createdAt` on `/complaints/{complaintId}` and `/users/{userId}` can never be altered after creation. Timestamps must strictly equal `request.time`.
4. **Terminal State Locking**: Once a complaint reaches `status == "Terselesaikan"`, the author cannot revert or edit its core fields; only an admin can intervene if correction is needed.
5. **Master Gate on Subcollections (`/complaints/{complaintId}/notes/{noteId}`)**: A follow-up note cannot exist without an existing parent complaint, `complaintAuthorId` must match the parent's `authorId`, and only the parent owner or an admin can read or post notes.
6. **Strict Schema & Size Guards**: Every document enforces `keys().hasAll(...)` and `keys().hasOnly(...)`, path IDs match `^[a-zA-Z0-9_-]+$` (`<= 128` chars), and every string and array enforces explicit `.size()` boundaries.

## 2. The "Dirty Dozen" Attack Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Read/Write**: Anonymous/unauthenticated user attempts `get` or `create` on `/complaints/c1`.
2. **Unverified Email Spoofing**: User with `email: "ptk.aja507@gmail.com"` and `email_verified: false` attempts admin `list` or `update` on `/complaints`.
3. **Self-Assigned Admin Role Escalation**: Teacher sends `POST /users/{uid}` with `{ role: "admin" }`.
4. **Cross-Tenant Complaint Hijack**: Teacher A creates `/complaints/c2` with `authorId: "teacherB_uid"`.
5. **Cross-Tenant Complaint Snooping (List)**: Teacher A runs `collection('complaints')` query without `where('authorId', '==', teacherA_uid)`.
6. **Shadow Field Injection**: Teacher creates complaint with an extra ghost field `{ isApproved: true }`.
7. **Status Shortcutting on Create**: Teacher creates complaint directly with `status: "Terselesaikan"` or pre-populated `officialResponse: "Disetujui"`.
8. **Post-Resolution Tampering**: Teacher attempts to modify `title` or revert `status` after complaint reached `"Terselesaikan"`.
9. **Path ID Poisoning**: Attacker writes to `/complaints/` using a 300-character or special-character document ID (`"../../evil"`).
10. **Denial-of-Wallet String/Array Overflow**: Teacher submits a `description` > 3000 chars or `solutionSteps` with > 10 items.
11. **Timestamp Forgery**: Client submits `createdAt: Timestamp(2020-01-01)` instead of server `request.time`.
12. **Orphaned / Spoofed Note Injection**: Teacher A posts to `/complaints/teacherB_complaint/notes/n1` or spoofs `authorRole: "admin"`.
