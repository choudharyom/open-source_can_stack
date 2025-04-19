import { useState } from 'react';

export default function Tooltip({ children, content, position = 'top' }) {
  const [isVisible, setIsVisible] = useState(false);
  
  let positionClasses = '';
  
  switch (position) {
    case 'top':
      positionClasses = 'bottom-full left-1/2 transform -translate-x-1/2 mb-1';
      break;
    case 'bottom':
      positionClasses = 'top-full left-1/2 transform -translate-x-1/2 mt-1';
      break;
    case 'left':
      positionClasses = 'right-full top-1/2 transform -translate-y-1/2 mr-1';
      break;
    case 'right':
      positionClasses = 'left-full top-1/2 transform -translate-y-1/2 ml-1';
      break;
    default:
      positionClasses = 'bottom-full left-1/2 transform -translate-x-1/2 mb-1';
  }
  
  return (
    <div 
      className="relative inline-block" 
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className={`absolute z-10 ${positionClasses}`}>
          <div className="bg-gray-800 text-white text-xs rounded py-1 px-2 max-w-xs">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}