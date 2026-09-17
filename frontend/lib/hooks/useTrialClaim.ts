"use client";
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getContractAddress } from "../genlayer/client";
import { useWallet } from "../genlayer/wallet";
import { TrialClaimContract } from "../contracts/TrialClaim";

export function useTrialClaimContract() {
  const {address}=useWallet(); const contractAddress=getContractAddress();
  return useMemo(()=>contractAddress ? new TrialClaimContract(contractAddress as `0x${string}`,address) : null,[contractAddress,address]);
}
export function useClaimCount(){const c=useTrialClaimContract();return useQuery({queryKey:["trialclaim-count"],queryFn:()=>c!.getCount(),enabled:!!c,refetchInterval:15000});}
export function useClaim(id:number){const c=useTrialClaimContract();return useQuery({queryKey:["trialclaim",id],queryFn:async()=>({claim:await c!.getClaim(id),assessment:await c!.getAssessment(id)}),enabled:!!c&&id>0,retry:false});}
export function useRefreshTrialClaim(){const q=useQueryClient();return()=>{void q.invalidateQueries({queryKey:["trialclaim-count"]});void q.invalidateQueries({queryKey:["trialclaim"]});};}
