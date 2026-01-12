import { Contact } from "lucide-react";
import React from "react";

const members = [
  {
    name: "Shahnawaz Saddam Butt",
    role: "Full-Stack Developer",
    bio: "Passionate full-stack developer focused on building scalable web apps, admin dashboards, and modern UI experiences.",
    skills: [
      "Next.js",
      "React",
      "Node.js",
      "MongoDB",
      "Tailwind",
      "UI/UX",
      "SQL",
    ],
    portfolio: "https://shahnawaz.buttnetworks.com",
    Contact:"mailto:shahnawazsaddamb@gmail.com"
  },
  {
    name: "Wahb Amir",
    role: "Full-Stack Developer",
    bio: "Creative developer with strong problem-solving skills, delivering high-performance web applications and clean architectures.",
    skills: ["React", "Next.js", "Express", "MongoDB", "UI/UX", "TypeScript"],
    portfolio: "https://wahb.space",
    contact:"mailto:wahbamir2010@gmail.com"
  },
];

const Team = () => {
  return (
    <>
      <section className="-mt-1 px-4">
        <h1 className="text-gray-900 font-bold text-[30px] sm:text-[40px] text-center">
          Our Team Members
        </h1>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {members.map((team, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition"
            >
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl">
                {team.name.charAt(0)}
              </div>

              {/* Info */}
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                {team.name}
              </h2>

              <p className="text-blue-600 font-medium">{team.role}</p>

              <p className="mt-3 text-gray-600 text-sm leading-relaxed">
                {team.bio}
              </p>

              {/* Skills */}
              <div className="mt-4">
                <h1 className="text-sm font-semibold text-gray-700 mb-2">
                  Top Skills:
                </h1>

                <div className="flex flex-wrap gap-2">
                  {team.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 text-xs rounded-full bg-blue-50 text-blue-600 font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                <a
                  href={team.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
                >
                  
                  Portfolio
                </a>

                <a
                  href={team.contact}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2 bg-blue-700 text-white rounded-lg text-sm hover:bg-blue-700 transition"
                >
                    <Contact className="inline-block mr-2" size={16} />
                  Contact
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

    </>
  );
};

export default Team;