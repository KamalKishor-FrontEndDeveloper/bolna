import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  subtitle?: string;
}

export function LoadingSpinner({ message = 'Loading...', subtitle = 'Please wait while we fetch your data' }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center">
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-20 w-20 rounded-full bg-blue-100 animate-ping opacity-75"></div>
          </div>
          <div className="relative flex items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
          </div>
        </div>
        <p className="text-gray-700 text-xl font-semibold mt-8 animate-pulse">{message}</p>
        <p className="text-gray-500 text-sm mt-2">{subtitle}</p>
      </div>
    </div>
  );
}
