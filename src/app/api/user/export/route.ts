import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    // 1. Check Authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;

    // 2. Fetch all user data
    const user = await db.user.findUnique({
      where: { email: userEmail },
      include: {
        accounts: {
          select: {
            provider: true,
            providerAccountId: true,
            // Exclude sensitive tokens
          }
        },
        sessions: {
          select: {
            expires: true,
            // Exclude session tokens
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 3. Prepare export data (GDPR Article 20 compliant)
    const exportData = {
      exportDate: new Date().toISOString(),
      userData: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        credits: user.credits,
        isPro: user.isPro,
        createdAt: user.createdAt,
      },
      accounts: user.accounts.map(account => ({
        provider: account.provider,
        providerAccountId: account.providerAccountId,
      })),
      sessions: user.sessions.map(session => ({
        expiresAt: session.expires,
      })),
    };

    // 4. Return JSON file
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="clearseller-data-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });

  } catch (error) {
    console.error("Data export error:", error);
    return NextResponse.json(
      { error: "Failed to export data. Please try again or contact support." },
      { status: 500 }
    );
  }
}
