import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import SettingsClient from "@/components/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    redirect("/sign-in");
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    include: {
      stores: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <SettingsClient
      user={{
        name: user.name || "",
        email: user.email,
        image: user.image || "",
        isPro: user.isPro,
        descriptionCredits: user.descriptionCredits,
        bgRemovalCredits: user.bgRemovalCredits,
        bgChangeCredits: user.bgChangeCredits,
      }}
      stores={user.stores}
    />
  );
}
