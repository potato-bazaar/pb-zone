import React from 'react';
import { Inbox } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EmptyState, PageHeader, Panel } from '../ui/pb';

interface PlaceholderViewProps {
  title: string;
  description: string;
  icon?: LucideIcon;
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({ title, description, icon = Inbox }) => {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={title} description={description} />
      <Panel>
        <EmptyState
          icon={icon}
          title={`No ${title.toLowerCase()} found`}
          description="Entries will show up here as soon as there is data for this section."
        />
      </Panel>
    </div>
  );
};
