interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, action, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">{title}</h1>
        {description && <p className="text-slate-500">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        {action}
        {children}
      </div>
    </div>
  );
}
