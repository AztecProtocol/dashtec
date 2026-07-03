'use client';

import React from 'react';

interface BalanceWithUsdProps {
  formatted: string;
  className?: string;
}

export const BalanceWithUsd: React.FC<BalanceWithUsdProps> = ({
  formatted,
  className = '',
}) => {
  return <span className={className}>{formatted}</span>;
};
