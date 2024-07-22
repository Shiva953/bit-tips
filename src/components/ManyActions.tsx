"use client"

import '@dialectlabs/blinks/index.css';
import { useState, useEffect, useMemo } from 'react';
import { Action, Blink, ActionsRegistry, type ActionAdapter } from "@dialectlabs/blinks";
import { useAction, useActionsRegistryInterval } from '@dialectlabs/blinks/react';

export const ManyActions = ({ adapter }: { adapter: ActionAdapter }) => {
    const apiUrls = useMemo(() => (['https://bit-tips.vercel.app/api/actions/tip']), []);
    const [actions, setActions] = useState<Action[]>([]);
    
    useEffect(() => {
        const fetchActions = async () => {
            const promises = apiUrls.map(url => Action.fetch(url).catch(() => null));
            const actions = await Promise.all(promises);
            
            setActions(actions.filter(Boolean) as Action[]);
        }
        
        fetchActions();
    }, [apiUrls]);
    
    // we need to update the adapter every time, since it's dependent on wallet and walletModal states
    useEffect(() => {
        actions.forEach((action) => action.setAdapter(adapter));
    }, [actions, adapter]);
    
    return actions.map(action => (
        <div key={action.url} className="flex flex-row gap-2 w-[28rem] h-96 mx-auto">
            <Blink stylePreset="x-dark" action={action} websiteText={new URL(action.url).hostname} />
        </div>
    ))
}