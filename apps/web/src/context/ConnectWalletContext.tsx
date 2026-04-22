'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount } from 'wagmi';

interface ValidatorSocials {
  x_handle: string | null;
  x_image_url: string | null;
  discordUsername: string | null;
  discordAvatar: string | null;
}

interface ConnectWalletContextType {
  isUserValidator: boolean;
  validatorSocials: ValidatorSocials | null;
  isLoading: boolean;
  error: string | null;
}

const ConnectWalletContext = createContext<ConnectWalletContextType | undefined>(undefined);

export const useConnectWallet = () => {
  const context = useContext(ConnectWalletContext);
  if (context === undefined) {
    throw new Error('useConnectWallet must be used within a ConnectWalletProvider');
  }
  return context;
};

interface ConnectWalletProviderProps {
  children: ReactNode;
}

export const ConnectWalletProvider: React.FC<ConnectWalletProviderProps> = ({ children }) => {
  const { isConnected, address } = useAccount();
  const [isUserValidator, setIsUserValidator] = useState(false);
  const [validatorSocials, setValidatorSocials] = useState<ValidatorSocials | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAddress, setLastFetchedAddress] = useState<string | null>(null);

  useEffect(() => {
    const fetchValidatorData = async () => {
      if (!isConnected || !address) {
        setIsUserValidator(false);
        setValidatorSocials(null);
        setError(null);
        setLastFetchedAddress(null);
        return;
      }

      // Skip if we already fetched data for this address
      if (address === lastFetchedAddress) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/validators/${address}/profile`);
        
        if (response.ok) {
          const data = await response.json();
          setIsUserValidator(true);
          setValidatorSocials({
            x_handle: data.x_handle,
            x_image_url: data.x_image_url,
            discordUsername: data.discordUsername,
            discordAvatar: data.discordAvatar
          });
        } else {
          setIsUserValidator(false);
          setValidatorSocials(null);
        }
        
        setLastFetchedAddress(address);
      } catch (err) {
        console.error('Failed to fetch sequencer data:', err);
        setError('Failed to fetch sequencer data');
        setIsUserValidator(false);
        setValidatorSocials(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchValidatorData();
  }, [isConnected, address, lastFetchedAddress]);

  const value: ConnectWalletContextType = {
    isUserValidator,
    validatorSocials,
    isLoading,
    error
  };

  return (
    <ConnectWalletContext.Provider value={value}>
      {children}
    </ConnectWalletContext.Provider>
  );
};