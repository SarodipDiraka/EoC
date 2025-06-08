import { getAssetPath } from "@/asset-paths";
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
    return (
        <Html lang="en">
            <Head />
            <body style={{
                margin: 0,
                backgroundImage: `url(${getAssetPath('assets/images/piiixl/bg.gif')})`,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                backgroundBlendMode: 'darken',
                overflow: 'hidden'
            }}>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
