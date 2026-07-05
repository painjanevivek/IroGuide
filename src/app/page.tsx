"use client";

import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Chrome, Circle, Eye, EyeOff, Github } from "lucide-react";

const heroVideoUrl = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260506_081238_406ed0e3-5d83-436e-a512-0bbff7ec5b95.mp4";

const heroContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const heroChild = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export default function App() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="flex min-h-screen w-full bg-black selection:bg-white/30 p-2 transition-all duration-500 lg:h-screen lg:overflow-hidden lg:p-4">
      <section className="relative hidden w-[52%] flex-col items-center justify-end overflow-hidden rounded-3xl px-12 pb-32 shadow-2xl lg:flex">
        <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline>
          <source src={heroVideoUrl} type="video/mp4" />
        </video>

        <motion.div
          className="z-10 w-full max-w-xs space-y-8"
          variants={heroContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="flex items-center gap-3" variants={heroChild}>
            <Circle className="h-5 w-5 fill-white text-white" />
            <span className="text-xl font-semibold tracking-tight">IroGuide</span>
          </motion.div>

          <motion.div className="space-y-3 text-center" variants={heroChild}>
            <h1 className="text-4xl font-medium tracking-tight whitespace-nowrap">Join IroGuide</h1>
          </motion.div>
        </motion.div>
      </section>

      <section className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-12 sm:px-12 lg:overflow-hidden lg:px-16 lg:py-6 xl:px-24">
        <motion.div
          className="w-full max-w-xl space-y-8 sm:space-y-10 lg:space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <header className="space-y-3">
            <h2 className="text-3xl font-medium tracking-tight">Create New Profile</h2>
            <p className="text-sm text-white/40">Input your basic details to begin the journey.</p>
          </header>

          <div className="grid grid-cols-2 gap-4">
            <SocialButton icon={<Chrome className="h-5 w-5" />} label="Google" />
            <SocialButton icon={<Github className="h-5 w-5" />} label="Github" />
          </div>

          <div className="relative flex items-center">
            <div className="flex-grow border-t border-white/10" />
            <span className="bg-black px-4 text-xs font-medium tracking-widest text-white/40 uppercase">Or</span>
            <div className="flex-grow border-t border-white/10" />
          </div>

          <form className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InputGroup label="First Name" placeholder="Nova" type="text" />
              <InputGroup label="Last Name" placeholder="Sterling" type="text" />
            </div>

            <InputGroup label="Email" placeholder="nova@iroguide.space" type="email" />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-white" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="h-11 w-full rounded-xl border-none bg-brand-gray px-4 pr-12 text-white placeholder:text-white/20 focus:ring-2 focus:ring-white/20 focus:outline-none"
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-4 -translate-y-1/2 text-white/40 transition hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-white/30">Requires at least 8 symbols.</p>
            </div>

            <button
              type="submit"
              className="mt-4 h-14 w-full rounded-xl bg-white font-semibold text-black transition hover:bg-white/90 active:scale-[0.98]"
            >
              Create Account
            </button>
          </form>

          <p className="text-center text-sm text-white/40">
            Member of the team?{" "}
            <a className="font-medium text-white transition hover:text-white/70" href="#">
              Log in
            </a>
          </p>
        </motion.div>
      </section>
    </main>
  );
}

function SocialButton({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button type="button" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-black text-sm font-medium text-white transition hover:bg-white/5">
      {icon}
      <span>{label}</span>
    </button>
  );
}

function InputGroup({ label, placeholder, type }: { label: string; placeholder: string; type: string }) {
  const inputId = label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-white" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        type={type}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border-none bg-brand-gray px-4 text-white placeholder:text-white/20 focus:ring-2 focus:ring-white/20 focus:outline-none"
      />
    </div>
  );
}
