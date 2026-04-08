"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FaGithub } from "react-icons/fa";
import { 
  Briefcase, 
  CheckCircle, 
  AlertCircle, 
  Settings, 
  Zap, 
  Layout 
} from "lucide-react";

const AboutPage = () => {
  const features = [
    {
      tag: "[ 01 ]",
      icon: Briefcase,
      title: "Quote Requests",
      desc: "Clients provide necessary details upfront so work starts with a clear, documented scope.",
    },
    {
      tag: "[ 02 ]",
      icon: Layout,
      title: "Live Messaging",
      desc: "Real-time communication keeps project context direct and significantly reduces email fragmentation.",
    },
    {
      tag: "[ 03 ]",
      icon: Zap,
      title: "Progress Tracking",
      desc: "Automated updates from development activity and commits provide visual transparency.",
    },
    {
      tag: "[ 04 ]",
      icon: Settings,
      title: "GitHub Integration",
      desc: "Repos and pull requests sync directly to automate progress reporting and status updates.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] text-stone-900 selection:bg-teal-900 selection:text-teal-50">
      <main className="flex-1">
        
        {/* --- Hero Section --- */}
        <section className="border-b border-stone-200 bg-white px-6 py-24 md:py-32">
          <div className="mx-auto max-w-5xl text-center">
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 font-mono text-[11px] uppercase tracking-[0.3em] text-stone-400"
            >
              The Architecture
            </motion.p>
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-serif text-[clamp(40px,6vw,72px)] leading-[1.1] tracking-tight text-stone-950"
            >
              Engineering <em className="italic text-teal-800">momentum.</em>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mx-auto mt-8 max-w-2xl text-[16px] font-light leading-relaxed text-stone-500 md:text-[18px]"
            >
              A single-platform collaboration tool designed to replace fragmented 
              email processes with automated reporting and enterprise-grade isolation.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-12 flex justify-center"
            >
              <Link
                href="https://github.com/wahb-amir/dashboard"
                target="_blank"
                className="group flex items-center gap-3 rounded-full bg-stone-950 px-8 py-4 text-[14px] font-medium text-stone-50 transition-colors hover:bg-teal-900"
              >
                <FaGithub className="text-[18px]" />
                View Repository
                <span className="text-stone-500 transition-transform group-hover:translate-x-1 group-hover:text-stone-50">↗</span>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* --- Context Grid (Problem / Role) --- */}
        <section className="border-b border-stone-200">
          <div className="mx-auto grid max-w-6xl grid-cols-1 md:grid-cols-2">
            <div className="border-b border-stone-200 p-8 md:border-b-0 md:border-r md:p-16">
              <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-teal-700">[ the problem ]</p>
              <h2 className="mb-6 font-serif text-[28px] text-stone-950">Fragile workflows.</h2>
              <p className="text-[15px] font-light leading-relaxed text-stone-500">
                Traditional projects relied on email and spreadsheets, leading to missed updates, 
                unclear ownership, and constant status-check requests.
              </p>
            </div>
            <div className="p-8 md:p-16">
              <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-teal-700">[ the role ]</p>
              <h2 className="mb-6 font-serif text-[28px] text-stone-950">Architect & Lead.</h2>
              <p className="text-[15px] font-light leading-relaxed text-stone-500">
                As the Full-Stack Engineer, I owned the end-to-end design of client workflows, 
                GitHub integration, and CI/CD automation. Built to 100% 
                TypeScript precision.
              </p>
            </div>
          </div>
        </section>

        {/* --- Key Features Grid --- */}
        <section className="bg-white py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-16">
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-stone-400">Capabilities</p>
              <h2 className="font-serif text-[42px] tracking-tight">System features.</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-px bg-stone-200 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <div key={f.tag} className="bg-white p-8 transition-colors hover:bg-stone-50">
                  <p className="mb-6 font-mono text-[10px] text-stone-400">{f.tag}</p>
                  <f.icon className="mb-6 h-6 w-6 text-teal-800" strokeWidth={1.5} />
                  <h3 className="mb-3 text-[16px] font-medium text-stone-900">{f.title}</h3>
                  <p className="text-[13.5px] font-light leading-relaxed text-stone-500">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- Dark Section: Results --- */}
        <section className="bg-stone-950 px-6 py-24 text-stone-50">
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-teal-500">[ outcome ]</p>
                <h2 className="mb-8 font-serif text-[42px] leading-tight">
                  Quantifiable <br />
                  <em className="italic text-stone-400">transparency.</em>
                </h2>
                <ul className="space-y-6">
                  {[
                    "Clearer visibility for clients with fewer status meetings.",
                    "Elimination of manual update emails for developers.",
                    "Single source of truth for all project activity.",
                    "Automated GitHub progress reduced manual reporting overhead."
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-4">
                      <CheckCircle className="mt-1 h-4 w-4 text-teal-500" />
                      <span className="text-[15px] font-light text-stone-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-stone-800 bg-stone-900/50 p-8 lg:p-12">
                <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.2em] text-stone-500">Constraint Analysis</p>
                <div className="space-y-8">
                  <div>
                    <p className="text-[13px] font-medium text-stone-200">The Timeline</p>
                    <p className="mt-1 text-[13px] font-light text-stone-500">MVP delivered in 8 weeks.</p>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-stone-200">The Security</p>
                    <p className="mt-1 text-[13px] font-light text-stone-500">Role-based access and enterprise-grade data isolation.</p>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-stone-200">The Performance</p>
                    <p className="mt-1 text-[13px] font-light text-stone-500">Optimized for Google Lighthouse scores of 90+.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AboutPage;