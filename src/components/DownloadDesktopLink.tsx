import React from 'react';
import { getDesktopDownloadUrl, getPlatformLabel } from '../services/downloadLink';

interface DownloadDesktopLinkProps {
  variant?: 'button' | 'link';
  className?: string;
}

const DownloadDesktopLink: React.FC<DownloadDesktopLinkProps> = ({ variant = 'button', className = '' }) => {
  const href = getDesktopDownloadUrl();
  const label = `Download for ${getPlatformLabel()}`;

  if (variant === 'link') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`text-sm text-blue-600 dark:text-blue-400 hover:underline ${className}`}
      >
        {label}
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors ${className}`}
    >
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
      </svg>
      {label}
    </a>
  );
};

export default DownloadDesktopLink;