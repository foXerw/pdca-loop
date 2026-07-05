import { prisma } from '@/lib/db';

// 个人阶段：硬编码单一用户。将来加注册登录时，只改本文件。
// 使用稳定 id `single-user`，与 seed 脚本一致，确保 dev 运行时与测试指向同一用户。
const SEED_USER_ID = 'single-user';
const SEED_USER_NAME = 'me';

export async function getCurrentUserId(): Promise<string> {
  let user = await prisma.user.findUnique({ where: { id: SEED_USER_ID } });
  if (!user) {
    user = await prisma.user.create({
      data: { id: SEED_USER_ID, name: SEED_USER_NAME },
    });
  }
  return user.id;
}
