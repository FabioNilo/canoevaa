type Props = {
  steps: string[];
  current: number;
};

export function Stepper({ steps, current }: Props) {
  return (
    <ol className="grid grid-cols-4 gap-2">
      {steps.map((step, index) => {
        const active = index <= current;

        return (
          <li key={step} className="min-w-0">
            <div className={`h-2 rounded-full ${active ? "bg-ocean" : "bg-line"}`} />
            <p className={`mt-2 truncate text-xs font-bold ${active ? "text-deep" : "text-muted"}`}>{step}</p>
          </li>
        );
      })}
    </ol>
  );
}
