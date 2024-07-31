import React from 'react';

interface TextareaProps {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
}

const Textarea: React.FC<TextareaProps> = ({ value, onChange, placeholder, className = '' }) => {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full p-2 border border-gray-300 rounded ${className}`}
    />
  );
};

export default Textarea;