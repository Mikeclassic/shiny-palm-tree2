import { db } from './db';

export async function checkAndDeductCredit(userEmail: string): Promise<{ success: boolean; error?: string; remaining?: number }> {
  try {
    const user = await db.user.findUnique({
      where: { email: userEmail },
      select: { id: true, credits: true, isPro: true }
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Pro users have unlimited credits
    if (user.isPro) {
      return { success: true, remaining: -1 }; // -1 indicates unlimited
    }

    // Check if user has credits
    if (user.credits < 1) {
      return { success: false, error: 'Out of credits. Upgrade to Pro for unlimited usage.' };
    }

    // Deduct credit
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: { credits: { decrement: 1 } }
    });

    return { success: true, remaining: updatedUser.credits };
  } catch (error) {
    console.error('Credit check error:', error);
    return { success: false, error: 'Failed to process credit check' };
  }
}

export async function getUserCredits(userEmail: string): Promise<{ credits: number; isPro: boolean } | null> {
  try {
    const user = await db.user.findUnique({
      where: { email: userEmail },
      select: { credits: true, isPro: true }
    });

    return user;
  } catch (error) {
    console.error('Get user credits error:', error);
    return null;
  }
}
