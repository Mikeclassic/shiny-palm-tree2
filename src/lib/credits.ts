import { db } from './db';

export type CreditType = 'description' | 'bgRemoval' | 'bgChange';

const CREDIT_FIELD_MAP = {
  description: 'descriptionCredits',
  bgRemoval: 'bgRemovalCredits',
  bgChange: 'bgChangeCredits',
} as const;

const OPERATION_NAMES = {
  description: 'AI Description Generation',
  bgRemoval: 'Background Removal',
  bgChange: 'Background Change',
} as const;

export async function checkAndDeductCredit(
  userEmail: string,
  creditType: CreditType
): Promise<{ success: boolean; error?: string; remaining?: number }> {
  try {
    const user = await db.user.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        descriptionCredits: true,
        bgRemovalCredits: true,
        bgChangeCredits: true,
        isPro: true
      }
    });

    if (!user) {
      return { success: false, error: 'User account not found. Please sign in again.' };
    }

    // Pro users have unlimited credits
    if (user.isPro) {
      return { success: true, remaining: -1 }; // -1 indicates unlimited
    }

    const creditField = CREDIT_FIELD_MAP[creditType];
    const currentCredits = user[creditField];
    const operationName = OPERATION_NAMES[creditType];

    // Check if user has credits for this operation type
    if (currentCredits < 1) {
      return {
        success: false,
        error: `You've reached your daily limit for ${operationName}. You'll receive 5 more credits tomorrow, or upgrade to Pro for unlimited access.`
      };
    }

    // Deduct credit for specific operation type
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: { [creditField]: { decrement: 1 } }
    });

    return { success: true, remaining: updatedUser[creditField] };
  } catch (error) {
    console.error('Credit check error:', error);
    return {
      success: false,
      error: 'We encountered an issue processing your request. Please try again in a moment.'
    };
  }
}

export async function getUserCredits(userEmail: string): Promise<{
  descriptionCredits: number;
  bgRemovalCredits: number;
  bgChangeCredits: number;
  isPro: boolean;
} | null> {
  try {
    const user = await db.user.findUnique({
      where: { email: userEmail },
      select: {
        descriptionCredits: true,
        bgRemovalCredits: true,
        bgChangeCredits: true,
        isPro: true
      }
    });

    return user;
  } catch (error) {
    console.error('Get user credits error:', error);
    return null;
  }
}
