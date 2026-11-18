import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
export function SectionPanel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="section-panel">
      <div className="panel-heading">
        <h1>{title}</h1>
        {action}
      </div>
      <Card className="border-0 bg-white py-0 shadow-none">
        <CardContent className="p-5 sm:p-8">{children}</CardContent>
      </Card>
    </section>
  );
}
