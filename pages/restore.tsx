import { AnimatePresence, motion } from "framer-motion";
import { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { UploadDropzone } from "react-uploader";
import { Uploader } from "uploader";
import { CompareSlider } from "../components/CompareSlider";
import LoadingDots from "../components/LoadingDots";
import ResizablePanel from "../components/ResizablePanel";
import Toggle from "../components/Toggle";
import appendNewToName from "../utils/appendNewToName";
import downloadPhoto from "../utils/downloadPhoto";
import NSFWPredictor from "../utils/nsfwCheck";
import va from "@vercel/analytics";

// Configuration for the uploader
const uploader = Uploader({
  apiKey: !!process.env.NEXT_PUBLIC_UPLOAD_API_KEY
    ? process.env.NEXT_PUBLIC_UPLOAD_API_KEY
    : "free",
});

const options = {
  maxFileCount: 1,
  mimeTypes: ["image/jpeg", "image/png", "image/jpg"],
  editor: { images: { crop: false } },
  styles: { colors: { primary: "#4f46e5" } },
  onValidate: async (file: File): Promise<undefined | string> => {
    let isSafe = false;
    try {
      isSafe = await NSFWPredictor.isSafeImg(file);
      if (!isSafe) va.track("NSFW Image blocked");
    } catch (error) {
      console.error("NSFW predictor threw an error", error);
    }
    return isSafe
      ? undefined
      : "Detected a NSFW image which is not allowed. If this was a mistake, please contact us for support.";
  },
};

const PS2Logo = ({ className = "" }) => (
  <svg className={`w-16 h-16 ${className}`} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    {/* SVG content remains the same */}
  </svg>
);

const Home: NextPage = () => {
  const [originalPhoto, setOriginalPhoto] = useState<string | null>(null);
  const [restoredImage, setRestoredImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [restoredLoaded, setRestoredLoaded] = useState<boolean>(false);
  const [sideBySide, setSideBySide] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  const [ps2Style, setPS2Style] = useState<string>("general");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [processingMessage, setProcessingMessage] = useState<string>("");
  const [imageLoadAttempts, setImageLoadAttempts] = useState(0);
  const [showFallbackImage, setShowFallbackImage] = useState(false);

  useEffect(() => {
    const isDarkMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(isDarkMode);
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem("darkMode", newDarkMode.toString());
  };

  const ps2Styles = [
    { value: "general", label: "General PS2 Style" },
    { value: "gta", label: "Grand Theft Auto" },
    { value: "finalfantasy", label: "Final Fantasy" },
    { value: "metalgear", label: "Metal Gear Solid" },
    { value: "residentevil", label: "Resident Evil" },
  ];

  useEffect(() => {
    const basePrompt = "PS2 era video game character, low-poly 3D model, 480p resolution, early 2000s graphics";
    let stylePrompt = "";
    switch (ps2Style) {
      case "gta":
        stylePrompt = ", Grand Theft Auto style, urban setting, satirical";
        break;
      case "finalfantasy":
        stylePrompt = ", Final Fantasy style, JRPG character, fantastical";
        break;
      case "metalgear":
        stylePrompt = ", Metal Gear Solid style, stealth action, military";
        break;
      case "residentevil":
        stylePrompt = ", Resident Evil style, survival horror, zombies";
        break;
      default:
        stylePrompt = ", generic PS2 game character";
    }
    setPrompt(`${basePrompt}${stylePrompt}`);
  }, [ps2Style]);

  const UploadDropZone = () => (
    <UploadDropzone
      uploader={uploader}
      options={options}
      onUpdate={(file) => {
        if (file.length !== 0) {
          setPhotoName(file[0].originalFile.originalFileName);
          setOriginalPhoto(file[0].fileUrl.replace("raw", "thumbnail"));
          generatePhoto(file[0].fileUrl.replace("raw", "thumbnail"));
        }
      }}
      width="670px"
      height="250px"
    />
  );

  async function generatePhoto(fileUrl: string) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    setLoading(true);
    setError(null);
    setRestoredImage(null);
    setRestoredLoaded(false);
    setProcessingMessage("Initializing PS2 transformation...");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: fileUrl,
          prompt: prompt,
          style: "Video game",
        }),
      });

      let jsonResponse = await res.json();
      console.log("API Response:", jsonResponse);

      if (res.status !== 200) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      if (jsonResponse.result) {
        console.log("Setting restored image URL:", jsonResponse.result);
        setRestoredImage(jsonResponse.result[0]);
        setLoading(false);
        setProcessingMessage("");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Error in generate request:", error);
      setError((error as Error).message || "An unexpected error occurred");
      setLoading(false);
      setProcessingMessage("");
    }
  }

  const handlePreview = () => {
    if (originalPhoto) {
      // This is a mock preview. In a real scenario, you'd generate a low-res preview using the API
      setPreviewImage(originalPhoto);
    }
  };

  const handleImageLoad = useCallback(() => {
    console.log("Image loaded successfully");
    setRestoredLoaded(true);
    setImageLoadAttempts(0);
    setShowFallbackImage(false);
  }, []);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error("Error loading image:", e);
    if (imageLoadAttempts < 3) {
      console.log(`Retrying image load (attempt ${imageLoadAttempts + 1})`);
      setImageLoadAttempts(prev => prev + 1);
    } else {
      console.log("Max retries reached, showing fallback image");
      setShowFallbackImage(true);
      setError("Failed to load the generated image. Displaying fallback image.");
    }
  }, [imageLoadAttempts]);

  useEffect(() => {
    if (restoredImage && imageLoadAttempts > 0) {
      const timer = setTimeout(() => {
        console.log(`Retrying image load after error (attempt ${imageLoadAttempts})`);
        setRestoredImage(restoredImage + '?retry=' + imageLoadAttempts);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [restoredImage, imageLoadAttempts]);

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white'}`}>
      <Head>
        <title>PS2 Filter AI | Transform Your Photos into PlayStation 2 Characters</title>
        <meta name="description" content="Use our free PS2 Filter AI to transform your photos into classic PlayStation 2 game characters. Choose from various iconic PS2 game styles and create nostalgic gaming art in seconds!" />
        <meta name="keywords" content="PS2 Filter AI, PlayStation 2, retro gaming, photo transformation, AI image processing, nostalgia, free online tool" />
        <link rel="icon" href="/favicon.ico" />
        <meta property="og:title" content="PS2 Filter AI | Transform Photos into PlayStation 2 Characters" />
        <meta property="og:description" content="Transform your photos into classic PS2 game characters with our free AI tool. Choose from various iconic PS2 game styles!" />
        <meta property="og:image" content="https://ps2filterai.com/og-image.png" />
        <meta property="og:url" content="https://ps2filterai.com/restore" />
        <meta name="twitter:card" content="summary_large_image" />
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
            <Link href="/" className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 ${darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-600 text-white hover:bg-blue-700'} h-10 px-4 py-2`}>
              Back to Home
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mt-4 sm:mt-8">
        <h1 className={`mx-auto max-w-4xl font-display text-4xl font-bold tracking-normal text-slate-900 sm:text-6xl mb-5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Transform Your Photo into a <span className="text-blue-600">PS2 Game Character</span>
        </h1>
        <p className={`text-slate-500 mt-2 mb-8 text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Experience the magic of AI-powered nostalgia. Turn your photos into iconic PlayStation 2 style characters in seconds!
        </p>

        <ResizablePanel>
          <AnimatePresence mode="wait">
            <motion.div className="flex justify-between items-center w-full flex-col mt-4">
              <div className="flex flex-col space-y-4 w-full max-w-[670px] mb-8">
                <div>
                  <label htmlFor="ps2-style" className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Choose Your PS2 Game Style
                  </label>
                  <select
                    id="ps2-style"
                    value={ps2Style}
                    onChange={(e) => setPS2Style(e.target.value)}
                    className={`bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                  >
                    {ps2Styles.map((style) => (
                      <option key={style.value} value={style.value}>{style.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="prompt" className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Custom Prompt (Optional)
                  </label>
                  <input
                    type="text"
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Add custom details to your PS2 character"
                    className={`bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                  />
                </div>
              </div>

              <Toggle
                className={`${restoredLoaded ? "visible mb-6" : "invisible"}`}
                sideBySide={sideBySide}
                setSideBySide={(newVal) => setSideBySide(newVal)}
              />
              {restoredLoaded && sideBySide && (
                <CompareSlider
                  original={originalPhoto!}
                  restored={restoredImage!}
                />
              )}
              {!originalPhoto && <UploadDropZone />}
              {originalPhoto && !restoredImage && (
                <Image
                  alt="original photo"
                  src={originalPhoto}
                  className="rounded-2xl"
                  width={475}
                  height={475}
                />
              )}
              {restoredImage && originalPhoto && !sideBySide && (
                <div className="flex sm:space-x-4 sm:flex-row flex-col">
                  <div>
                    <h2 className="mb-1 font-medium text-lg">Original Photo</h2>
                    <Image
                      alt="original photo"
                      src={originalPhoto}
                      className="rounded-2xl relative"
                      width={475}
                      height={475}
                    />
                  </div>
                  <div className="sm:mt-0 mt-8">
                    <h2 className="mb-1 font-medium text-lg">Your PS2 Game Character</h2>
                    <a href={restoredImage} target="_blank" rel="noreferrer">
                      {showFallbackImage ? (
                        <img
                          alt="generated PS2 style photo"
                          src={restoredImage}
                          className="rounded-2xl relative sm:mt-0 mt-2 cursor-zoom-in"
                          style={{ width: '475px', height: '475px', objectFit: 'contain' }}
                        />
                      ) : (
                        <Image
                          alt="generated PS2 style photo"
                          src={restoredImage}
                          className="rounded-2xl relative sm:mt-0 mt-2 cursor-zoom-in"
                          width={475}
                          height={475}
                          onLoadingComplete={handleImageLoad}
                          onError={handleImageError}
                        />
                      )}
                    </a>
                  </div>
                </div>
              )}
              {loading && (
                <button
                  disabled
                  className="bg-blue-500 rounded-full text-white font-medium px-4 pt-2 pb-3 mt-8 hover:bg-blue-500/80 w-40"
                >
                  <span className="pt-4">
                    <LoadingDots color="white" style="large" />
                  </span>
                </button>
              )}
              {error && (
                <div
                  className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mt-8 max-w-[575px]"
                  role="alert"
                >
                  <div className="flex">
                    <div className="py-1">
                      <svg
                        className="fill-current h-6 w-6 text-red-500 mr-4"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                      >
                        <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold">Error</p>
                      <p className="text-sm">{error}</p>
                    </div>
                  </div>
                </div>
              )}
              {processingMessage && (
                <p className={`mt-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {processingMessage}
                </p>
              )}
              <div className="flex space-x-2 justify-center mt-4">
                {originalPhoto && !loading && (
                  <>
                    <button
                      onClick={() => {
                        setOriginalPhoto(null);
                        setRestoredImage(null);
                        setRestoredLoaded(false);
                        setError(null);
                        setPreviewImage(null);
                      }}
                      className="bg-blue-500 rounded-full text-white font-medium px-4 py-2 hover:bg-blue-500/80 transition"
                    >
                      Upload New Photo
                    </button>
                    <button
                      onClick={handlePreview}
                      className="bg-blue-500 rounded-full text-white font-medium px-4 py-2 hover:bg-blue-500/80 transition"
                    >
                      Preview PS2 Effect
                    </button>
                  </>
                )}
                {restoredLoaded && (
                  <button
                    onClick={() => {
                      downloadPhoto(restoredImage!, appendNewToName(photoName!));
                    }}
                    className="bg-white rounded-full text-black border font-medium px-4 py-2 hover:bg-gray-100 transition"
                  >
                    Download PS2 Character
                  </button>
                )}
              </div>
              {previewImage && (
                <div className="mt-4">
                  <h3 className="text-lg font-medium mb-2">PS2 Effect Preview</h3>
                  <Image
                    alt="PS2 style preview"
                    src={previewImage}
                    className="rounded-2xl"
                    width={250}
                    height={250}
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    This is a low-resolution preview. The final result may vary.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </ResizablePanel>
      </main>

      <footer className={`w-full ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} py-12`}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="flex flex-col items-center md:items-start">
              <PS2Logo className="mb-4" />
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Transform your photos into iconic PlayStation 2 style characters with our cutting-edge AI technology.
              </p>
            </div>
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Quick Links</h3>
              <ul className={`space-y-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <li><Link href="/" className="hover:text-blue-500 transition">Home</Link></li>
                <li><Link href="/restore" className="hover:text-blue-500 transition">Transform Photo</Link></li>
                <li><Link href="#" className="hover:text-blue-500 transition">About Us</Link></li>
                <li><Link href="#" className="hover:text-blue-500 transition">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Legal</h3>
              <ul className={`space-y-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <li><Link href="#" className="hover:text-blue-500 transition">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-blue-500 transition">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-blue-500 transition">Cookie Policy</Link></li>
              </ul>
            </div>
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Connect With Us</h3>
              <div className="flex space-x-4">
                <a href="#" className="text-blue-500 hover:text-blue-600 transition">
                  <span className="sr-only">Facebook</span>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-blue-500 hover:text-blue-600 transition">
                  <span className="sr-only">Instagram</span>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className="text-blue-500 hover:text-blue-600 transition">
                  <span className="sr-only">Twitter</span>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className={`mt-8 pt-8 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <p className={`text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              © 2023 PS2 Filter AI. All rights reserved. Created with ❤️ by AI enthusiasts.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;