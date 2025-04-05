import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';

interface TodoProps {
  id: string;
  title: string;
  completed: boolean;
  onToggle: () => void;
  description?: string;
}

const Todo: React.FC<TodoProps> = ({ id, title, completed, onToggle, description }) => {
  return (
    <div className="group flex items-start mb-2">
      <div className="flex-shrink-0 mt-0.5 mr-2 cursor-pointer" onClick={onToggle}>
        {completed ? (
          <CheckCircle className="h-5 w-5 text-accent3" />
        ) : (
          <Circle className="h-5 w-5 text-gray-400 group-hover:text-accent2" />
        )}
      </div>
      <div className="flex-1">
        <label 
          htmlFor={`task-${id}`}
          className={`cursor-pointer text-base ${
            completed ? 'line-through text-gray-500' : 'text-black'
          } group-hover:text-accent2 transition-colors`}
          onClick={onToggle}
        >
          {title}
        </label>
        {description && (
          <p className={`text-sm mt-1 ${completed ? 'text-gray-400' : 'text-gray-600'}`}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

export default Todo; 