import { cn } from "@/lib/utils";

type PageHeadingProps = {
  title: string;
  description: string;
  eyebrow?: string;
  className?: string;
};

export function PageHeading({ title, description, eyebrow, className }: PageHeadingProps) {
  return (
    <div className={cn("animate-rise space-y-2 pb-6", className)}>
      {eyebrow ? (
        <p className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="font-display text-3xl font-semibold tracking-tight text-(--foreground)] sm:text-[2.15rem]">{title}</h1>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
