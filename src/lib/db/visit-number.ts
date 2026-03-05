// Generates visit numbers like VIS-2026-0001
// Must be called INSIDE a Prisma transaction to prevent race conditions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateVisitNumber(tx: any): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `VIS-${year}-`;

  const lastVisit = await tx.visit.findFirst({
    where: { visitNumber: { startsWith: prefix } },
    orderBy: { visitNumber: 'desc' },
  });

  let nextNum = 1;
  if (lastVisit) {
    const lastNum = parseInt(lastVisit.visitNumber.split('-').pop() || '0', 10);
    nextNum = lastNum + 1;
  }

  return `${prefix}${nextNum.toString().padStart(4, '0')}`;
}
