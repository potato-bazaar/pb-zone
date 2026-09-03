import { OrderDetailsScreen } from "@/components/orders/OrderDetailsScreen";

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <OrderDetailsScreen orderId={decodeURIComponent(orderId)} />;
}
