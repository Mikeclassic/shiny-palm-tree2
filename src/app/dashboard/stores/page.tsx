import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import StoreConnectionsClient from "@/components/StoreConnectionsClient";

export const dynamic = "force-dynamic";

export default async function StoresPage() {
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

  return <StoreConnectionsClient stores={user.stores} />;
}
