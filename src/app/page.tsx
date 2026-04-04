import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export default async function Home() {
  const userCount = await prisma.user.count();
  redirect(userCount === 0 ? '/dashboard' : '/login');
}
