import { FileSearch } from "lucide-react";
import { EmptyState } from "@/components/states/EmptyState";

export const FileDetailsCard = () => {
  return (
    <EmptyState
      icon={FileSearch}
      title="Select a file to view details"
      description="Pick a file in the tree to see its imports, exports, size, and dependents."
    />
  );
};
