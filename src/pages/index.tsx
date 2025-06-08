import Head from "next/head";
import { Inter } from "next/font/google";
import styles from "@/styles/Home.module.css";
import dynamic from "next/dynamic";
import { getAssetPath } from "@/asset-paths";

const inter = Inter({ subsets: ["latin"] });

const AppWithoutSSR = dynamic(() => import("@/App"), { ssr: false });

export default function Home() {
    return (
        <>
            <Head>
                <title>End of Course</title>
                <meta name="description" content="Game." />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href={getAssetPath('/favicon.png')} />
            </Head>
            <main className={`${styles.main} ${inter.className}`}>
                <AppWithoutSSR />
            </main>
        </>
    );
}

// Это нужно для статического экспорта
export async function getStaticProps() {
  return { props: {} };
}
