import * as tf from "@tensorflow/tfjs";
import * as nsfwjs from "nsfwjs";

tf.enableProdMode();

class NSFWPredictor {
  model: nsfwjs.NSFWJS | null = null;
  isModelInitialized: boolean = false;
  isModelInitializing: boolean = false;
  modelInitAttempts: number = 0;
  maxInitAttempts: number = 5; // Increased from 3 to 5

  constructor() {
    this.model = null;
    this.getModel();
  }

  async getModel() {
    if (this.modelInitAttempts >= this.maxInitAttempts) {
      console.error("Max model initialization attempts reached");
      return;
    }

    this.isModelInitializing = true;
    try {
      this.model = await nsfwjs.load(
        "https://nsfw-model-1.s3.us-west-2.amazonaws.com/nsfw-predict-model/",
        // @ts-ignore
        { type: "graph" }
      );
      this.isModelInitialized = true;
      this.isModelInitializing = false;
      console.log("NSFW model loaded successfully");
    } catch (error) {
      console.error("Error loading NSFW model:", error);
      this.modelInitAttempts++;
      this.isModelInitializing = false;
      setTimeout(() => this.getModel(), 5000); // Increased delay to 5 seconds
    }
  }

  async waitForModel(timeout = 30000): Promise<void> {
    const startTime = Date.now();
    while (!this.isModelInitialized && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!this.isModelInitializing && this.modelInitAttempts < this.maxInitAttempts) {
        this.getModel(); // Retry initialization if it's not currently initializing
      }
    }
    if (!this.isModelInitialized) {
      throw new Error("Model initialization timed out. Please refresh the page and try again.");
    }
  }

  async predict(element: HTMLImageElement, guesses: number) {
    await this.waitForModel();
    if (!this.model) {
      throw new Error("Model is not available. Please try again later.");
    }
    return this.model.classify(element, guesses);
  }

  async predictImg(file: File, guesses = 5) {
    const url = URL.createObjectURL(file);
    try {
      const img = document.createElement("img");
      img.width = 400;
      img.height = 400;

      img.src = url;
      return await new Promise<nsfwjs.predictionType[]>((res) => {
        img.onload = async () => {
          const results = await this.predict(img, guesses);
          URL.revokeObjectURL(url);
          res(results);
        };
      });
    } catch (error) {
      console.error("Error predicting image:", error);
      URL.revokeObjectURL(url);
      throw error;
    }
  }

  async isSafeImg(file: File) {
    try {
      const predictions = await this.predictImg(file, 3);
      const pornPrediction = predictions.find(
        ({ className }) => className === "Porn"
      );
      const hentaiPrediction = predictions.find(
        ({ className }) => className === "Hentai"
      );

      if (!pornPrediction || !hentaiPrediction) {
        return true;
      }
      return !(
        pornPrediction.probability > 0.25 || hentaiPrediction.probability > 0.25
      );
    } catch (error) {
      console.error("Error checking image safety:", error);
      throw error;
    }
  }
}

export default new NSFWPredictor();
