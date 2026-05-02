# Security Specification: Kinly Family Hub

## Data Invariants
1. A user must belong to exactly one family group (identified by a 6-digit `familyId`).
2. Posts, Tasks, and VaultItems are private to members of the specific `familyId`.
3. Users cannot modify their `familyId` once set (unless they leave, which resets it).
4. All timestamps must be server-generated (`request.time`).
5. Authorship of posts and tasks must be validated against `request.auth.uid`.

## The "Dirty Dozen" Payloads (Attack Vectors)

| # | Attack | Resource | Payload Snippet | Expected Result |
|---|---|---|---|---|
| 1 | Identity Spoofing | Post | `{ authorId: "other_uid" }` | PERMISSION_DENIED |
| 2 | Cross-Family Read | Vault | `get /families/OTHER_ID/vault/secret` | PERMISSION_DENIED |
| 3 | Ghost Field Injection | Task | `{ taskName: "Milk", hackerProp: true }` | PERMISSION_DENIED |
| 4 | State Shortcut | Task | `{ isCompleted: true }` (on creation) | VALID (if owner), but must match schema |
| 5 | Identity integrity | User | `{ familyId: "hacker_family" }` (update) | PERMISSION_DENIED |
| 6 | Resource Poisoning | Task | `{ taskName: "A".repeat(2000) }` | PERMISSION_DENIED (size check) |
| 7 | Orphaned Write | Post | `{ familyId: "non_existent" }` | PERMISSION_DENIED (relational check) |
| 8 | Timestamp Hijack | Post | `{ timestamp: "2020-01-01" }` | PERMISSION_DENIED (must be `request.time`) |
| 9 | Blanket Read | Post | `list /families/ID/posts` (unauthenticated) | PERMISSION_DENIED |
| 10| Privilege Escalation | Family| `{ name: "New Name" }` (by non-member) | PERMISSION_DENIED |
| 11| PII Leak | User | `get /users/SOMEONE_ELSE` | ALLOWED (only for same family members) |
| 12| Delete Bypass | Post | `delete /families/ID/posts/UID_POST` (by stranger) | PERMISSION_DENIED |

## Technical Implementation Plan
- **Master Gate**: All sub-collection access depends on `isFamilyMember(familyId)`.
- **Validation Blueprints**: `isValidPost`, `isValidTask`, `isValidUser`, `isValidVaultItem`.
- **Action-Based Updates**: Separate logic for checking off tasks vs editing task names.
- **Terminal State Locking**: (Not strictly needed for tasks, but can be applied if a task becomes "archived").
