import React, { useEffect } from 'react'
import Head from 'next/head'
import Script from 'next/script'
import '../styles/globals.css'
import '../styles/markdown.css'
import type { AppProps } from 'next/app'

function MyApp({ Component, pageProps }: AppProps) {
    useEffect(() => {
        console.log('App mounted or re-rendered at:', new Date().toISOString());

        const logPageVisibility = () => {
            console.log('Page visibility changed:', document.hidden ? 'hidden' : 'visible', 'at', new Date().toISOString());
        };

        document.addEventListener('visibilitychange', logPageVisibility);

        const originalPushState = history.pushState;
        history.pushState = function() {
            console.log('Navigation occurred at:', new Date().toISOString());
            return originalPushState.apply(this, arguments);
        };

        return () => {
            document.removeEventListener('visibilitychange', logPageVisibility);
            history.pushState = originalPushState;
        };
    }, []);

    return (
        <>
            <Head>
                <link rel="icon" href="/favicon.ico" />
                <title>VortexTau</title>
                <meta description={"VortexTau.com is an advanced chat engine powered by state-of-the-art LLM models developed by 0xroyce @ Seedgularity."}></meta>
            </Head>
            {/* Google Analytics */}
            <Script
                src="https://www.googletagmanager.com/gtag/js?id=G-9Q81GGYWEM"
                strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
                {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', 'G-9Q81GGYWEM');
        `}
            </Script>
            <Component {...pageProps} />
        </>
    )
}

export default MyApp