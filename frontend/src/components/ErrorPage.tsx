"use client";

import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

interface ErrorPageProps {
  title: string;
  message: string;
}

export function ErrorPage({ title, message }: ErrorPageProps) {
  return (
    <div className="min-h-screen bg-[#050510] flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
          <div className="text-center">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-2xl font-bold text-red-400 mb-4"
            >
              {title}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-cyan-100/60"
            >
              {message}
            </motion.p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
