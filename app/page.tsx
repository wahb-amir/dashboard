import React from "react";

import Link from "next/link";
import FeatureCard from "./components/FeatureCard";
import { checkAuth } from "./utils/checkAuth";

const Page = async () => {
  const auth = await checkAuth();
  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-800">
      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-20 md:py-32 lg:py-40 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center space-y-8 text-center">
              {/* Headline */}
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 font-headline">
                  Effortless Client & Developer Collaboration
                </h1>
                <p className="mx-auto max-w-175 text-gray-600 md:text-xl">
                  Replaces fragmented emails and chats with a single platform
                  for quotes, messaging, and automated progress reporting.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 mt-4">
                <Link
                  href={auth ? "/dashboard" : "/register"}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow-md transition"
                >
                  Get Started
                </Link>
                <Link
                  href="/about"
                  className="px-6 py-3 border border-gray-300 hover:bg-gray-100 text-gray-800 font-medium rounded-md transition"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </section>
        <div>
          <FeatureCard />
        </div>
      </main>
    </div>
  );
};

export default Page;
