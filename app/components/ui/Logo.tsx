"use client";
import Image from "next/image";

const Logo = ({ className }: { className?: string }) => {
  return (
    <div className={"flex items-center gap-2 font-bold"}>
      <div className="bg-primary w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0">
        <Image
          src="/logo.png"
          alt="Nav logo"
          width={40}
          height={40}
          className="object-cover"
        />
      </div>
      <span className="text-sm md:text-xl  tracking-tighter text-black">
        Dashboard
      </span>
    </div>
  );
};

export default Logo;
