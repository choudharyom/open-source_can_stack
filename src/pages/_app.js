// pages/_app.js

import '../styles/globals.css';
import Head from 'next/head';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        {/* Font Awesome CDN */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.0.0/css/all.min.css"
        />
        {/* PrismJS CSS CDN */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/prismjs@1.25.0/themes/prism-tomorrow.min.css"
        />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;