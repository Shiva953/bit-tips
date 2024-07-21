"use client"

import '@dialectlabs/blinks/index.css';
import { useMemo } from 'react';
import { useAction, useActionsRegistryInterval, useActionAdapter } from '@dialectlabs/blinks/react';
import { ManyActions } from "@/components/ManyActions"
import { clusterApiUrl, Connection } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {PhantomWalletAdapter, LedgerWalletAdapter} from "@solana/wallet-adapter-wallets"
import {
  WalletModalProvider,
  WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import {ConnectionProvider, WalletProvider} from "@solana/wallet-adapter-react"

require('@solana/wallet-adapter-react-ui/styles.css');

// needs to be wrapped with <WalletProvider /> and <WalletModalProvider />
export default function Home(){
    // SHOULD be the only instance running (since it's launching an interval)
    const { isRegistryLoaded } = useActionsRegistryInterval();
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed")
    const { adapter } = useActionAdapter(connection);
    const network = WalletAdapterNetwork.Devnet;
    // const API_KEY = process.env.HELIUS_API_KEY!;
    // You can also provide a custom RPC endpoint.
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);
    // const endpoint = `https://mainnet.helius-rpc.com/?api-key=8b5f554c-f521-4d05-b6a6-eb3071c87768`

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),new LedgerWalletAdapter()
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [network]
    );
    
    return (
      <>
      <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletMultiButton className="m-8"/>
          <div className='mx-auto'>
            {isRegistryLoaded ? <ManyActions adapter={adapter} /> : null}
            </div>
            </WalletModalProvider>
            </WalletProvider>
            </ConnectionProvider>
      </>
      )
}
