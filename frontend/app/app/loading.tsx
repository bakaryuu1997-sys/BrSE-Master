import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center space-y-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
      <div className="space-y-2 text-center">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  );
}
