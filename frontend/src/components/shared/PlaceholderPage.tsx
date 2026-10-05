/**
 * Placeholder page for unimplemented sections.
 * Shows phase status and coming-soon message.
 */
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description: string;
  phase: number;
}

export function PlaceholderPage({ title, description, phase }: PlaceholderPageProps) {
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-96">
      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
        <Construction size={24} className="text-gray-400" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-500 mt-1 text-center max-w-sm">{description}</p>
      <div className="mt-4 px-3 py-1 bg-amber-50 border border-amber-100 rounded-full">
        <span className="text-xs font-medium text-amber-700">Coming in Phase {phase}</span>
      </div>
    </div>
  );
}
