import { RoomReader } from "@/components/rooms/RoomReader";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RoomReader id={id} />;
}
