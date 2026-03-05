// Generates visit numbers like VIS-2026-0001
export async function generateVisitNumber(): Promise<string> {
  // Import db inside function to avoid circular deps
  const { db } = await import('./index');
  const year = new Date().getFullYear();
  const prefix = `VIS-${year}-`;

  const lastVisit = await db.visit.findFirst({
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
