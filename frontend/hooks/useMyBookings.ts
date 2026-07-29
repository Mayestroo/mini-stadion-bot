import { useQuery } from "@tanstack/react-query";
import { bookingApi } from "@/lib/api";

export function useMyBookings(enabled: boolean = true) {
  return useQuery({
    queryKey: ["my-bookings"],
    queryFn: () => bookingApi.getMyBookings(),
    enabled,
  });
}
