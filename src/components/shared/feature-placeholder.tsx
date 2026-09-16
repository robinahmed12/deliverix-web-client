import { PageHeader } from "@/components/shared/page-header";

interface FeaturePlaceholderProps {
  title: string;
  description?: string;
  phase?: string;
}

export function FeaturePlaceholder({
  title,
  description,
  phase = "a later phase",
}: FeaturePlaceholderProps) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        This module is planned for {phase}.
      </div>
    </div>
  );
}

export default FeaturePlaceholder;