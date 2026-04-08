import { FC } from "react";
import { 
  FileCode2, 
  ShieldCheck, 
  MessageSquareText, 
  Zap, 
  Github,
  Layers
} from "lucide-react";

interface Feature {
  tag: string;
  title: string;
  description: string;
  icon: any; // Lucide icon component
}

const features: Feature[] = [
  {
    tag: "[ source ]",
    title: "Single source of truth",
    description: "Your entire project lives in one place. Specs, quotes, and deliverables bypass the email inbox entirely.",
    icon: FileCode2,
  },
  {
    tag: "[ scope ]",
    title: "Structured agreements",
    description: "Submit a brief, receive a precise quote. Scope, milestones, and pricing are mathematically laid out.",
    icon: ShieldCheck,
  },
  {
    tag: "[ comms ]",
    title: "Contextual messaging",
    description: "Direct, asynchronous chat mapped directly to the project phase. Signal over noise.",
    icon: MessageSquareText,
  },
  {
    tag: "[ sync ]",
    title: "Automated tracking",
    description: "Milestones tick over automatically as backend and frontend work merges. No manual reporting.",
    icon: Zap,
  },
  {
    tag: "[ pipeline ]",
    title: "GitHub pipeline",
    description: "Repository commits and PRs sync directly to the dashboard interface. Code speaks for itself.",
    icon: Github,
  },
];

const FeatureCard: FC = () => {
  return (
    <section className="mx-auto max-w-6xl">
      {/* Header Section */}
      <div className="border-x border-t border-stone-200 bg-white px-8 py-20 md:px-12">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.3em] text-stone-400">
          Architecture
        </p>
        <h2 className="font-serif text-[clamp(32px,5vw,48px)] font-normal leading-tight tracking-tight text-stone-950">
          Built for <em className="italic text-teal-800">velocity.</em>
        </h2>
        <p className="mt-6 max-w-xl text-[15px] font-light leading-relaxed text-stone-500">
          The portal eliminates administrative friction, allowing focus to remain 
          entirely on high-performance engineering and rapid deployment.
        </p>
      </div>

      {/* Blueprint Grid */}
      <ul className="grid grid-cols-1 gap-px border border-stone-200 bg-stone-200 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, idx) => (
          <li
            key={idx}
            className="group relative flex flex-col bg-white px-8 py-12 transition-all duration-500 hover:bg-stone-50/50"
          >
            <div className="mb-10 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone-400 group-hover:text-teal-700 transition-colors">
                {feature.tag}
              </p>
              <feature.icon 
                size={20} 
                strokeWidth={1.25} 
                className="text-stone-300 group-hover:text-teal-800 transition-colors duration-500" 
              />
            </div>
            
            <h3 className="mb-4 font-serif text-[22px] text-stone-900 transition-transform duration-500 group-hover:translate-x-1">
              {feature.title}
            </h3>
            
            <p className="text-[14px] font-light leading-relaxed text-stone-500">
              {feature.description}
            </p>
            
            {/* Subtle corner accent on hover */}
            <div className="absolute bottom-4 right-4 h-1 w-1 rounded-full bg-teal-800 opacity-0 transition-opacity group-hover:opacity-100" />
          </li>
        ))}

        {/* The Roadmap/Future Cell */}
        <li className="flex flex-col justify-center bg-stone-950 px-8 py-12 text-stone-50">
          <div className="mb-6 flex items-center gap-3">
            <Layers size={18} className="text-teal-500" strokeWidth={1.5} />
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone-500">
              [ roadmap ]
            </p>
          </div>
          <p className="text-[14px] font-light leading-relaxed text-stone-400">
            Future architecture includes deeper integrations with Vercel Webhooks, 
            automated Stripe invoicing, and specialized AI-driven scope analysis.
          </p>
          <div className="mt-8 h-px w-12 bg-stone-800" />
        </li>
      </ul>
    </section>
  );
};

export default FeatureCard;