// app/page (or wherever your App component lives)
'use client';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QuoteRequestForm from './components/QuoteRequestForm';
import ConfirmModal from './components/ConfirmModal';
import ProjectDashboard from './components/Project';
import axios from 'axios';
import { useRouter } from "next/navigation";
import toast from 'react-hot-toast';
import { Zap } from 'lucide-react';


function SkeletonDashboard() {
  return (
    <div aria-hidden className="min-h-screen bg-gray-50 p-4 sm:p-8 font-['Inter']">
      <motion.header className="mb-8" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
        <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="h-8 w-3/5 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-2/5 bg-gray-200 rounded animate-pulse mt-2" />
          </div>
          <div className="flex gap-3 w-full sm:w-auto items-center">
            <div className="h-10 w-36 bg-gray-200 rounded-full animate-pulse" />
            <div className="h-10 w-28 bg-gray-200 rounded-3xl animate-pulse" />
          </div>
        </div>
      </motion.header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* left skeleton: search + list */}
        <div className="col-span-1 lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-xl shadow">
            <div className="h-5 w-1/3 bg-gray-200 rounded animate-pulse mb-3" />
            <div className="flex gap-3">
              <div className="flex-1 h-10 bg-gray-200 rounded animate-pulse" />
              <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow">
            <div className="h-5 w-1/2 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-gray-100">
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-28 mb-2 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-40 animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded w-20 mt-2 animate-pulse" />
                  </div>
                  <div className="h-8 w-14 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* right skeleton: main snapshot */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-xl shadow">
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-6 animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="h-20 bg-gray-200 rounded-xl animate-pulse" />
              <div className="h-20 bg-gray-200 rounded-xl animate-pulse" />
              <div className="h-20 bg-gray-200 rounded-xl animate-pulse" />
            </div>
            <div className="h-16 bg-gray-200 rounded-xl mb-6 animate-pulse" />
            <div className="h-40 bg-gray-200 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const mockUserName = 'Alex';
  const [name, setName] = useState(mockUserName);
  const router = useRouter();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  // isQuoteModalOpen now stores an object: { isOpen: boolean, setProject: function | null }
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState({ isOpen: false, setProject: null });
  const [projectCount, setProjectCount] = useState(0);

  // --- User/Auth Logic ---
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const checkAuth = async () => {
      try {
        const response = await axios.get('/api/auth/validAuthToken', { withCredentials: true });
        if (!mounted) return;
        setName(response?.data?.name || mockUserName);
      } catch (err) {
        console.error('❌ Auth error:', err?.message || err);
        // If not authenticated, redirect to login
        router.replace('/login');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkAuth();

    return () => { mounted = false; };
  }, [router]);

  const handleLogout = async () => {
    try {
      const res = await axios.get('/api/auth/logout', { withCredentials: true });
      if (!res?.data?.ok) {
        toast.error(res?.data?.message || "Logout failed.");
        return;
      }
      router.push("/login");
    } catch (error) {
      toast.error("An error occurred during logout.");
    }
  };

  const handleProjectCount = (count) => setProjectCount(count);

  const closeModal = () => setIsQuoteModalOpen({ isOpen: false, setProject: null });

  return (
    <>
      {/* Show skeleton overlay while loading */}
      <AnimatePresence>{loading && <SkeletonDashboard />}</AnimatePresence>

      {/* Main UI (rendered after loading) */}
      {!loading && (
        <div className="min-h-screen bg-gray-50 transition-colors duration-300 p-4 sm:p-8 font-['Inter']">
          {/* Modal - Check for isQuoteModalOpen.isOpen */}
          <AnimatePresence>
            {isQuoteModalOpen.isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/20"
                onClick={closeModal}
              >
                <div className="relative z-10" onClick={(e) => e.stopPropagation()}>
                  <QuoteRequestForm onClose={closeModal} setProject={isQuoteModalOpen.setProject} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header + Greeting */}
          <motion.header className="mb-8" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
                  Welcome back, <span className="text-blue-600">{name}</span>
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  You are tracking <span className="font-semibold text-gray-900">{projectCount}</span> projects.
                </p>
              </div>

              <div className="flex gap-3 w-full sm:w-auto items-center">
                <button
                  onClick={() => typeof setIsQuoteModalOpen === 'function' && setIsQuoteModalOpen({ isOpen: true, setProject: null })}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full shadow hover:bg-blue-700 transition"
                >
                  <Zap className="w-4 h-4" /> New Quote
                </button>

                <button
                  onClick={() => setIsLogoutModalOpen(true)}
                  className="ml-2 inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-3xl shadow hover:bg-red-600 transition"
                >
                  Logout
                </button>

                <ConfirmModal
                  open={isLogoutModalOpen}
                  onClose={() => setIsLogoutModalOpen(false)}
                  onConfirm={handleLogout}
                  title="Confirm Logout"
                  description="Are you sure you want to logout? Your session will be ended."
                />
              </div>
            </div>
          </motion.header>

          <ProjectDashboard setIsQuoteModalOpen={setIsQuoteModalOpen} projectCount={handleProjectCount} />
        </div>
      )}
    </>
  );
}
