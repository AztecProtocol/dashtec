'use client';

import { useState, HTMLAttributes } from 'react';
import { ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline';

interface CopyButtonProps extends HTMLAttributes<HTMLButtonElement> {
  textToCopy: string;
  displayText?: string; // Optional: if you want button text instead of just icon
  size?: 'sm' | 'md' | 'xs'; // xs for very tight spaces like tables
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  textToCopy,
  displayText,
  className,
  size = 'sm',
  ...props
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent event bubbling if the button is inside another clickable element
    e.preventDefault(); // Prevent default action if inside a link, for example
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  let iconSizeClass = 'h-4 w-4';
  let paddingClass = 'p-1';
  let textSizeClass = 'text-xs';

  if (size === 'md') {
    iconSizeClass = 'h-5 w-5';
    paddingClass = 'p-1.5';
    textSizeClass = 'text-sm';
  } else if (size === 'xs') {
    iconSizeClass = 'h-3.5 w-3.5';
    paddingClass = 'p-0.5'; // Smaller padding for xs
    textSizeClass = 'text-xs';
  }


  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`ml-1.5 rounded-md ${paddingClass} text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 focus:outline-none focus:ring-offset-1 dark:focus:ring-offset-slate-800 transition-all duration-150 ease-in-out inline-flex items-center flex-shrink-0 ${className || ''}`}
      aria-label={isCopied ? 'Copied!' : 'Copy to clipboard'}
      title={isCopied ? 'Copied!' : 'Copy to clipboard'}
      disabled={!textToCopy}
      {...props}
    >
      {isCopied ? (
        <CheckIcon className={`${iconSizeClass} text-green-500`} />
      ) : (
        <ClipboardIcon className={iconSizeClass} />
      )}
      {displayText && <span className={`ml-1 ${textSizeClass}`}>{isCopied ? "Copied!" : displayText}</span>}
    </button>
  );
};