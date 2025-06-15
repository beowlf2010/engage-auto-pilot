
import { useQuery } from "@tanstack/react-query";
import { fetchReconApprovals } from "@/services/inventory/reconService";

export default function useReconApprovals(serviceLineId: string) {
  return useQuery({
    queryKey: ["recon_approvals", serviceLineId],
    queryFn: () => fetchReconApprovals(serviceLineId),
    enabled: !!serviceLineId,
  });
}
