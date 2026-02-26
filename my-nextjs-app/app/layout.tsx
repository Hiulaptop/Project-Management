import React from 'react';
import './globals.css';
import Header from '../components/Header';

export const metadata = {
    title: 'My Next.js App',
    description: 'A simple Next.js application',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <html lang="en">
            <body>
                <Header />
                {children}
            </body>
        </html>
    );
};

export default RootLayout;