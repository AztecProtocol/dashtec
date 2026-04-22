'use client';

import React from 'react';

interface BalanceWithUsdProps {
  formatted: string;
  usd: string | null;
  className?: string;
  usdClassName?: string;
}

export const BalanceWithUsd: React.FC<BalanceWithUsdProps> = ({
  formatted,
  usd,
  className = '',
  usdClassName = '',
}) => {
  return (
    <>
      <span className={className}>{formatted}</span>
      {usd && <span className={usdClassName}>{usd}</span>}
    </>
  );
};
