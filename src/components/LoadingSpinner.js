export default function LoadingSpinner({ size = 'medium', text = 'Loading...' }) {
    const sizeClass = {
      small: 'h-4 w-4 border-2',
      medium: 'h-8 w-8 border-2',
      large: 'h-12 w-12 border-3'
    }[size];
    
    return (
      <div className="flex items-center justify-center">
        <div className={`animate-spin rounded-full ${sizeClass} border-b-2 border-gray-300 border-b-blue-600`}></div>
        {text && <span className="ml-3 text-gray-700">{text}</span>}
      </div>
    );
  }