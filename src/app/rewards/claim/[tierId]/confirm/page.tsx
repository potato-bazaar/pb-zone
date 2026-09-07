import { notFound } from "next/navigation";
import { ConfirmOrderScreen } from "@/components/rewards/ConfirmOrderScreen";
import { getRewardTierById } from "@/lib/rewardClaim";

export default async function ClaimConfirmPage({
  params,
}: {
  params: Promise<{ tierId: string }>;
}) {
  const { tierId } = await params;
  const tier = getRewardTierById(tierId);
  if (!tier) notFound();

  return <ConfirmOrderScreen tier={tier} tierId={tierId} />;
}
