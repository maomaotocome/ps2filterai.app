import { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";

const PS2Logo = ({ className = "" }) => (
  <svg className={`w-16 h-16 ${className}`} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: "#4f46e5", stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: "#7c3aed", stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <rect width="120" height="120" rx="24" fill="url(#grad1)" />
    <path d="M30 30 h60 v60 h-60 z" stroke="white" strokeWidth="6" fill="none" />
    <path d="M40 40 h40 v40 h-40 z" stroke="white" strokeWidth="4" fill="none" />
    <circle cx="60" cy="60" r="15" stroke="white" strokeWidth="4" fill="none" />
    <path d="M50 80 Q60 90 70 80" stroke="white" strokeWidth="4" fill="none" />
    <text x="60" y="20" fontFamily="Arial, sans-serif" fontSize="16" fill="white" textAnchor="middle">PS2</text>
    <text x="60" y="110" fontFamily="Arial, sans-serif" fontSize="12" fill="white" textAnchor="middle">Filter AI</text>
  </svg>
);

interface FloatingActionButtonProps {
  darkMode: boolean;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ darkMode }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`fixed bottom-8 right-8 flex items-center transition-all duration-300 ease-in-out ${isExpanded ? 'pr-4' : ''} ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} rounded-full shadow-lg text-white cursor-pointer`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <Link href="/restore" className="flex items-center justify-center p-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        {isExpanded && (
          <span className="ml-2 whitespace-nowrap">Try PS2 Filter AI</span>
        )}
      </Link>
    </div>
  );
};

const Home: NextPage = () => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDarkMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(isDarkMode);
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem("darkMode", newDarkMode.toString());
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white'}`}>
      <Head>
        <title>PS2 Filter AI | Transform Photos into PlayStation 2 Style Characters</title>
        <meta name="description" content="Use PS2 Filter AI to transform your photos into classic PlayStation 2 game characters. Free, instant, and powered by cutting-edge AI technology." />
        <meta name="keywords" content="PS2 Filter, AI photo transformation, retro gaming, PlayStation 2 graphics, nostalgia, free online tool" />
        <link rel="canonical" href="https://ps2filterai.com" />
        <meta property="og:title" content="PS2 Filter AI | Transform Photos into PlayStation 2 Style Characters" />
        <meta property="og:description" content="Transform your photos into classic PS2 game characters with our free AI tool. Instant, high-quality results!" />
        <meta property="og:image" content="https://ps2filterai.com/og-image.png" />
        <meta property="og:url" content="https://ps2filterai.com" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "PS2 Filter AI",
              "url": "https://ps2filterai.com",
              "description": "Transform photos into PlayStation 2 style game characters using AI",
              "applicationCategory": "PhotoEditor",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0"
              }
            }
          `}
        </script>
      </Head>
      <header className="container mx-auto px-4 py-6">
        <nav className="flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <PS2Logo />
            <span className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>PS2 Filter AI</span>
          </Link>
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-700"
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? '🌞' : '🌙'}
            </button>
            <Link href="/restore" className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 ${darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-600 text-white hover:bg-blue-700'} h-10 px-4 py-2`}>
              Try It Now
            </Link>
          </div>
        </nav>
      </header>
      <main className="container mx-auto px-4 py-12">
        <section className="text-center mb-16">
          <h1 className={`text-4xl md:text-6xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Transform Your Photos into
            <br />
            <span className="text-blue-600">PS2 Game Characters</span>
          </h1>
          <p className={`text-xl mb-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Experience the magic of AI-powered nostalgia. Turn your photos into iconic PlayStation 2 style characters in seconds!
          </p>
          <Link href="/restore" className="inline-flex items-center justify-center rounded-md text-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-14 px-8 py-3">
            Create Your PS2 Character Now
          </Link>
        </section>

        <section className="mb-16">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 transform skew-y-3 rounded-3xl"></div>
            <div className="relative grid md:grid-cols-2 gap-8 p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-xl">
              <div>
                <h2 className={`text-2xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Original Photo</h2>
                <Image
                  src="/ps2-original.png"
                  alt="Original photo before PS2 Filter AI transformation"
                  width={500}
                  height={400}
                  className="w-full rounded-lg shadow-lg"
                  loading="lazy"
                />
              </div>
              <div>
                <h2 className={`text-2xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>PS2 Style Transformation</h2>
                <Image
                  src="/PS2 Filter AI.png"
                  alt="Photo magically transformed with PS2 Filter AI"
                  width={500}
                  height={400}
                  className="w-full rounded-lg shadow-lg"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="text-center mb-16 scroll-mt-20">
          <h2 className={`text-3xl font-bold mb-8 ${darkMode ? 'text-white' : 'text-gray-900'}`}>How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Upload Your Photo", description: "Choose any photo you want to transform into PS2 style." },
              { title: "Select PS2 Game Style", description: "Pick from various iconic PS2 game aesthetics." },
              { title: "Get Your PS2 Character", description: "Receive your transformed image in seconds!" },
            ].map((step, index) => (
              <div key={index} className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <div className="text-3xl font-bold text-blue-600 mb-4">{index + 1}</div>
                <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{step.title}</h3>
                <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="why-choose" className="text-center mb-16 scroll-mt-20">
          <h2 className={`text-3xl font-bold mb-8 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Why Choose PS2 Filter AI?</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { title: "Free to Use", description: "No hidden charges or subscriptions required." },
              { title: "Instant Results", description: "Get your transformed image in seconds." },
              { title: "High Quality", description: "Powered by cutting-edge AI for the best results." },
              { title: "Multiple Styles", description: "Choose from various iconic PS2 game aesthetics." },
            ].map((feature, index) => (
              <div key={index} className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{feature.title}</h3>
                <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="text-center mb-16 scroll-mt-20">
          <h2 className={`text-3xl font-bold mb-8 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {faqData.map((faq, index) => (
              <div key={index} className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{faq.question}</h3>
                <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="text-center mb-16">
          <h2 className={`text-3xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Ready to Relive the PS2 Era?</h2>
          <p className={`text-xl mb-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Transform your photos now and share the nostalgia!</p>
          <Link href="/restore" className="inline-flex items-center justify-center rounded-md text-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-14 px-8 py-3">
            Start Your PS2 Transformation
          </Link>
        </section>
      </main>
      <footer className={`${darkMode ? 'bg-gray-800' : 'bg-gray-100'} py-8`}>
        <div className="container mx-auto px-4 text-center">
          <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>&copy; 2023 PS2 Filter AI. All rights reserved.</p>
        </div>
      </footer>
      <FloatingActionButton darkMode={darkMode} />
    </div>
  );
};

const faqData = [
  {
    question: "What is PS2 Filter AI?",
    answer: "PS2 Filter AI is an advanced artificial intelligence tool that transforms your photos into the iconic style of PlayStation 2 era video game characters, offering a unique blend of nostalgia and modern technology."
  },
  {
    question: "How does PS2 Filter AI work?",
    answer: "Our AI model has been trained on thousands of PS2 game images and characters. When you upload a photo, the AI analyzes it and applies various transformations to mimic the PS2 graphics style, including polygon reduction, texture simplification, and color palette adjustment."
  },
  {
    question: "Is PS2 Filter AI really free to use?",
    answer: "Yes, it's absolutely free! We believe in making nostalgic gaming experiences accessible to everyone. Our service has no hidden charges or subscriptions."
  },
  {
    question: "Can I choose specific PS2 game styles?",
    answer: "Absolutely! Our AI can recreate styles from popular PS2 franchises like Grand Theft Auto, Final Fantasy, Metal Gear Solid, and Resident Evil. You can select your preferred style before processing your image."
  }
];

export default Home;
