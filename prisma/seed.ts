import { prisma } from '@/lib/prisma';


const defaultMembers = [
  { id: 'member-1',  name: 'พรพิลาศ หาญชาญพานิชย์',    color: '#6366F1', bgColor: '#EEF2FF' },
  { id: 'member-2',  name: 'สุวัฒน จันทะจิตต์',          color: '#8B5CF6', bgColor: '#F5F3FF' },
  { id: 'member-3',  name: 'วาโย จันทราภานุสรณ์',        color: '#EC4899', bgColor: '#FDF2F8' },
  { id: 'member-4',  name: 'กิตติพงษ์ เรืองทรัพย์เอนก', color: '#EF4444', bgColor: '#FEF2F2' },
  { id: 'member-5',  name: 'ศิระ เลิศนวศรีชัย',          color: '#F59E0B', bgColor: '#FFFBEB' },
  { id: 'member-6',  name: 'ทรัพย์ทวี เพ็ชรสาย',         color: '#10B981', bgColor: '#ECFDF5' },
  { id: 'member-7',  name: 'อนุวัตร ชาชุมพร',            color: '#06B6D4', bgColor: '#ECFEFF' },
  { id: 'member-8',  name: 'พีรวัส นันท์สุทธิโกศล',      color: '#7C3AED', bgColor: '#F5F3FF' },
  { id: 'member-9',  name: 'พัฒน์ชัย สุรัตวิศิษฏ์',      color: '#3B82F6', bgColor: '#EFF6FF' },
  { id: 'member-10', name: 'สุพรรณี เขียวสลับ',          color: '#14B8A6', bgColor: '#F0FDFA' },
];

async function main() {
  console.log('🌱 Seeding members...');
  for (const member of defaultMembers) {
    await prisma.member.upsert({
      where: { id: member.id },
      update: { name: member.name, color: member.color, bgColor: member.bgColor },
      create: member,
    });
  }
  console.log(`✅ Seeded ${defaultMembers.length} members`);

  // Seed default startDate config (first day of current month)
  const now = new Date();
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  await prisma.config.upsert({
    where: { key: 'startDate' },
    update: {},
    create: { key: 'startDate', value: startDate },
  });
  console.log(`✅ Config seeded (startDate: ${startDate})`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
