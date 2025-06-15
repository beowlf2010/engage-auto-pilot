
import { useQuery } from "@tanstack/react-query";
import { fetchReconServiceLines } from "@/services/inventory/reconService";

export default function useReconServiceLines(inventoryId: string) {
  return useQuery({
    queryKey: ["recon_service_lines", inventoryId],
    queryFn: () => fetchReconServiceLines(inventoryId),
    enabled: !!inventoryId,
  });
}
