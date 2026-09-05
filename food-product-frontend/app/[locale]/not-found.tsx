import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-5xl flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        The page you are looking for does not exist.
      </p>
      <Link
        href="/en"
        className="rounded-4xl text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        Back to search
      </Link>
    </div>
  );
}
