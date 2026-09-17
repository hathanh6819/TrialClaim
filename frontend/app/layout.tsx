import type { Metadata, Viewport } from "next";
import "@genlayer/transaction-kit-react/styles.css";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata={metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL||"https://trialclaim.pages.dev"),title:"TrialClaim | Evidence-bound clinical claims",description:"Compare public clinical-trial claims with registered primary outcomes through GenLayer consensus.",icons:{icon:"/trialclaim-logo.png"},openGraph:{images:["/trialclaim-logo.png"]}};
export const viewport:Viewport={themeColor:"#f4fbfb"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body><Providers>{children}</Providers></body></html>}
