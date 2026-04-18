import { SectionHeader } from "@/components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/states/EmptyState";
import { Settings as SettingsIcon } from "lucide-react";

const Settings = () => {
  return (
    <div className="space-y-6">
      <SectionHeader title="Settings" description="Manage workspace, integrations, and preferences." />
      <Card className="border-border/60">
        <CardContent className="p-5">
          <EmptyState
            icon={SettingsIcon}
            title="Settings coming soon"
            description="Workspace configuration, integrations, and preferences will live here."
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
