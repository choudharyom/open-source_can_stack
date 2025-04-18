import "@/styles/globals.css";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className="antialiased text-gray-800 bg-gray-50 min-h-screen">
      <Component {...pageProps} />
    </div>
  );
}