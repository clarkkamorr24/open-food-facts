import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductGridSkeletonProps {
  count?: number;
}

export function ProductGridSkeleton({ count = 8 }: ProductGridSkeletonProps) {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <Card key={index} className="gap-3 py-3">
          <CardContent className="px-3">
            <Skeleton className="aspect-square w-full rounded-lg" />
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-2 px-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
