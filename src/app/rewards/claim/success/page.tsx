import { OrderPlacedClient } from "@/components/rewards/OrderPlacedClient";

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  return <OrderPlacedClient orderId={orderId ?? ""} />;
}
