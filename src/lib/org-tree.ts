/**
 * Organization tree helpers — work on the User self-referential hierarchy.
 *
 * Levels (top → bottom): VIEN_TRUONG > GIAM_DOC > TRUONG_BO_PHAN > STAFF
 * `null` level = user outside the org tree (typically Admin role).
 */

import { findAllUsers, findUserById } from "./db";

export const LEVELS = ["VIEN_TRUONG", "GIAM_DOC", "TRUONG_BO_PHAN", "STAFF"] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_LABEL: Record<string, string> = {
  VIEN_TRUONG: "Viện trưởng",
  GIAM_DOC: "Giám đốc điều hành",
  TRUONG_BO_PHAN: "Trưởng bộ phận",
  STAFF: "Nhân sự bộ phận",
};

export const LEVEL_RANK: Record<string, number> = {
  VIEN_TRUONG: 0,
  GIAM_DOC: 1,
  TRUONG_BO_PHAN: 2,
  STAFF: 3,
};

interface UserNode {
  id: string;
  name?: string | null;
  level?: string | null;
  managerId?: string | null;
}

/**
 * Get all subordinate user IDs (recursive, all depths).
 * Excludes the user themselves.
 */
export async function getSubordinatesRecursive(userId: string): Promise<string[]> {
  const all = (await findAllUsers()) as UserNode[];
  return collectSubordinates(userId, all);
}

function collectSubordinates(rootId: string, users: UserNode[]): string[] {
  const childrenByManager = new Map<string, string[]>();
  for (const u of users) {
    if (!u.id) continue;
    const m = u.managerId ?? "";
    if (!m) continue;
    if (!childrenByManager.has(m)) childrenByManager.set(m, []);
    childrenByManager.get(m)!.push(u.id);
  }

  const result: string[] = [];
  const stack: string[] = [rootId];
  const visited = new Set<string>();
  while (stack.length > 0) {
    const cur = stack.pop()!;
    if (visited.has(cur)) continue;
    visited.add(cur);
    const kids = childrenByManager.get(cur) || [];
    for (const k of kids) {
      if (!visited.has(k)) {
        result.push(k);
        stack.push(k);
      }
    }
  }
  return result;
}

/**
 * Check if `managerCandidate` is somewhere in the chain of `userId` (any depth).
 * Returns false if same user or not in chain.
 */
export async function isManagerOf(managerCandidateId: string, userId: string): Promise<boolean> {
  if (managerCandidateId === userId) return false;
  const subs = await getSubordinatesRecursive(managerCandidateId);
  return subs.includes(userId);
}

/**
 * Validate proposed manager assignment doesn't introduce a cycle.
 * Returns error message if invalid, null if OK.
 *
 * Rules:
 *   - User cannot be their own manager
 *   - Proposed manager must not be in the user's own subordinate chain
 */
export async function validateManagerAssignment(
  userId: string,
  proposedManagerId: string | null
): Promise<string | null> {
  if (!proposedManagerId) return null;
  if (proposedManagerId === userId) return "Không thể tự làm cấp trên của chính mình";

  // proposedManager must not be a (recursive) subordinate of userId
  const subs = await getSubordinatesRecursive(userId);
  if (subs.includes(proposedManagerId)) {
    return "Cấp trên được chọn đang là cấp dưới của người này (gây vòng lặp)";
  }

  // verify the proposed manager exists
  const m = await findUserById(proposedManagerId);
  if (!m) return "Không tìm thấy cấp trên được chọn";

  return null;
}

/**
 * Resolve which user IDs the given user can see attendance for.
 *
 * Rules:
 *   - ADMIN role: returns null (= no scope, see all)
 *   - VIEN_TRUONG level: returns null (= no scope, see all)
 *   - Other levels (GD, TBP): self + recursive subordinates
 *   - STAFF: self only
 */
export async function resolveAttendanceScope(user: {
  id: string;
  role: string;
  level: string | null;
}): Promise<string[] | null> {
  if (user.role === "ADMIN") return null;
  if (user.level === "VIEN_TRUONG") return null;
  const subs = await getSubordinatesRecursive(user.id);
  return [user.id, ...subs];
}

/**
 * Build a manager chain from `userId` up to the root.
 * Returns IDs in order: [direct manager, manager's manager, ..., root].
 */
export async function getManagerChain(userId: string): Promise<string[]> {
  const all = (await findAllUsers()) as UserNode[];
  const byId = new Map(all.map((u) => [u.id, u]));
  const chain: string[] = [];
  const visited = new Set<string>();
  let cur = byId.get(userId)?.managerId ?? null;
  while (cur && !visited.has(cur)) {
    visited.add(cur);
    chain.push(cur);
    cur = byId.get(cur)?.managerId ?? null;
  }
  return chain;
}
