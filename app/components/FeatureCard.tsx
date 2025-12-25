import { FC } from "react";
import {
  FaCheckCircle,
  FaGithub,
  FaComments,
  FaTasks,
  FaClipboard,
} from "react-icons/fa";
import { IconType } from "react-icons";

interface Feature {
  title: string;
  description: string;
  icon: IconType;
  // Tailwind-friendly color classes for the icon badge
  colorClass: string;
}

const features: Feature[] = [
  {
    title: "A Single Source of Truth",
    description:
      "From initial quote to final delivery, manage your entire project lifecycle in one place.",
    icon: FaClipboard,
    colorClass: "text-blue-600 bg-blue-50",
  },
  {
    title: "Quote Requests",
    description:
      "Clients can easily request quotes for new projects, providing all necessary details upfront.",
    icon: FaCheckCircle,
    colorClass: "text-green-600 bg-green-50",
  },
  {
    title: "Live Messaging",
    description:
      "Real-time chat between clients and developers, keeping communication fluid and centralized.",
    icon: FaComments,
    colorClass: "text-purple-600 bg-purple-50",
  },
  {
    title: "Progress Tracking",
    description:
      "Visualize project progress with automated updates from GitHub activity.",
    icon: FaTasks,
    colorClass: "text-yellow-600 bg-yellow-50",
  },
  {
    title: "GitHub Integration",
    description:
      "Seamlessly sync your repos, commits, and pull requests to automate progress reporting.",
    icon: FaGithub,
    colorClass: "text-gray-800 bg-gray-100",
  },
];

const FeatureCard: FC = () => {
  return (
    <section aria-labelledby="features-title" className="max-w-6xl mx-auto px-4 py-16">
      <h2 id="features-title" className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-12">
        Key Features
      </h2>

      <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <li
              key={idx}
              // use article/role semantics inside list item if you prefer; li is fine too
              className="flex flex-col p-6 bg-white/95 border border-gray-100 rounded-xl shadow-sm
                         transition-transform duration-200 transform-gpu hover:-translate-y-1 hover:shadow-lg"
              // performance hints:
              style={{
                willChange: "transform, opacity",
                // 'contain: paint' isolates painting; modern browsers benefit from it
                contain: "paint",
              }}
            >
              <div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4 ${feature.colorClass}`}
                aria-hidden
              >
                
                {/* @ts-ignore */}
                <Icon className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-700 text-sm">{feature.description}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default FeatureCard;
