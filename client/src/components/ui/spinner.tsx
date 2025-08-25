import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  };

  return (
    <div
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="loading"
    >
      <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
        Loading...
      </span>
    </div>
  );
}

interface LoadingOverlayProps {
  isLoading: boolean;
  text?: string;
  className?: string;
}

export function LoadingOverlay({ isLoading, text = "로딩 중...", className }: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div className={cn("fixed inset-0 bg-black/20 flex items-center justify-center z-50", className)}>
      <div className="bg-white rounded-lg p-6 flex flex-col items-center space-y-4 shadow-lg">
        <Spinner size="lg" className="text-yellow-500" />
        <p className="text-gray-700 font-medium">{text}</p>
      </div>
    </div>
  );
}