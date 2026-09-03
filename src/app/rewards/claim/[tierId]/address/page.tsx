import { notFound } from "next/navigation";
import { AddAddressScreen } from "@/components/rewards/AddAddressScreen";
import { getRewardTierById } from "@/lib/rewardClaim";

export default async function ClaimAddressPage({
  params,
}: {
  params: Promise<{ tierId: string }>;
}) {
  const { tierId } = await params;
  const tier = getRewardTierById(tierId);
  if (!tier) notFound();

  return <AddAddressScreen tierId={tierId} />;
}
