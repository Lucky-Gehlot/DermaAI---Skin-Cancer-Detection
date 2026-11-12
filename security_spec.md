# DermaAI Firestore Security Specification

## 1. Data Invariants
1. **Default-Deny Catch-All**: Every path not explicitly matched is denied for all reads and writes.
2. **Identity Integrity & Anti-Escalation**:
   - Users can only read/create/update/delete their own `/users/{userId}` document (`request.auth.uid == userId`).
   - Users cannot assign themselves `role == "admin"` on create or elevate `role` on update.
   - Admin access is verified strictly via `/admins/{uid}` existence or verified runtime admin email (`luckygehlot1400@gmail.com` with `request.auth.token.email_verified == true`).
3. **PII & Medical Privacy Isolation**:
   - No blanket `allow read: if isSignedIn();` on `/users` or `/assessments`.
   - Administrators cannot read user assessment medical images or lesion clinical notes via Firestore client rules unless strictly authorized; `/assessments` `get` and `list` enforce `resource.data.userId == request.auth.uid`.
4. **Immutable Ownership & Server Timestamps**:
   - `userId`, `uid`, and `createdAt` cannot be modified after creation.
   - `createdAt == request.time` on create; `updatedAt == request.time` on update.
5. **Strict Payload Boundaries**:
   - Every string field enforces `.size()` limits matching `firebase-blueprint.json`.
   - Every `create` enforces `hasAll` + `hasOnly`.
   - Every `update` enforces `affectedKeys().hasOnly(...)`.

## 2. Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. Unauthenticated read on `/users/{uid}`.
2. Cross-user read on `/users/{otherUid}` or `/assessments/{otherAssessmentId}`.
3. Unfiltered `list` query on `/assessments` without `where('userId', '==', uid)`.
4. Self-assigned `role: "admin"` during `/users/{uid}` create.
5. Role escalation updating `role` from `"patient"` to `"admin"` on `/users/{uid}`.
6. Shadow field injection (`isVerified: true`) on `/assessments/{id}` create.
7. Oversized `id` (>128 chars) or invalid characters (`../etc/passwd`) in document path ID.
8. Identity spoofing creating `/assessments/{id}` with `userId != request.auth.uid`.
9. Client-forged timestamp (`createdAt` != `request.time`).
10. Reassigning `userId` on `/assessments/{id}` update.
11. Non-admin creating or deleting `/articles/{id}`.
12. Unverified email spoof attempting admin privileges without `email_verified == true`.
