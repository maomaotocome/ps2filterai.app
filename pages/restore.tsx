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

      let jsonResponse;
      try {
        jsonResponse = await res.json();
      } catch (err) {
        console.error("Error parsing JSON response:", err);
        throw new Error("Failed to parse API response");
      }

      console.log("API Response:", jsonResponse);

      if (res.status !== 200) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      if (jsonResponse.error) {
        throw new Error(jsonResponse.error);
      }

      if (jsonResponse.result) {
        console.log("Setting restored image URL:", jsonResponse.result);
        setRestoredImage(jsonResponse.result);
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
        {/* Main content */}
        {/* (Include the rest of your JSX here, which should be the same as before) */}
      </main>

      <footer className={`w-full ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} py-12`}>
        {/* Footer content */}
        {/* (Include your footer JSX here, which should be the same as before) */}
      </footer>
    </div>
  );
};

export default Home;